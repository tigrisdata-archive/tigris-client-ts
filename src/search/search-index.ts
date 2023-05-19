import { DocStatus, TigrisIndexType } from "./types";
import { TigrisClientConfig } from "../tigris";
import { Utility } from "../utility";
import { Filter } from "../types";

import { SearchQuery } from "./query";
import { IndexedDoc, SearchCursor, SearchResult } from "./result";
import { SearchDriver } from "../driver/driver";

export class SearchIndex<T extends TigrisIndexType> {
	private readonly name: string;
	private readonly config: TigrisClientConfig;
	private readonly driver: SearchDriver;

	constructor(driver, name, config) {
		this.driver = driver;
		this.name = name;
		this.config = config;
	}

	createMany(docs: Array<T>): Promise<DocStatus[]> {
		const encodedDocs = docs.map((d) => this.encodedDoc(d));
		return this.driver.createMany(this.name, encodedDocs);
	}

	createOne(doc: T): Promise<DocStatus> {
		return new Promise<DocStatus>((resolve, reject) => {
			this.createMany([doc])
				.then((docStatuses) => resolve(docStatuses[0]))
				.catch((error) => reject(error));
		});
	}

	deleteMany(ids: string[]): Promise<DocStatus[]> {
		return this.driver.deleteMany(this.name, ids);
	}

	deleteByQuery(filter: Filter<T>): Promise<number> {
		return this.driver.deleteByQuery(
			this.name,
			Utility.stringToUint8Array(Utility.filterToString(filter))
		);
	}

	deleteOne(id: string): Promise<DocStatus> {
		return new Promise<DocStatus>((resolve, reject) => {
			this.deleteMany([id])
				.then((docStatuses) => resolve(docStatuses[0]))
				.catch((error) => reject(error));
		});
	}

	createOrReplaceMany(docs: Array<T>): Promise<Array<DocStatus>> {
		const encodedDocs = docs.map((d) => this.encodedDoc(d));
		return this.driver.createOrReplaceMany(this.name, encodedDocs);
	}

	createOrReplaceOne(doc: T): Promise<DocStatus> {
		return new Promise<DocStatus>((resolve, reject) => {
			this.createOrReplaceMany([doc])
				.then((docStatuses) => resolve(docStatuses[0]))
				.catch((error) => reject(error));
		});
	}

	getMany(ids: string[]): Promise<IndexedDoc<T>[]> {
		return this.driver.getMany<T>(this.name, ids);
	}

	getOne(id: string): Promise<IndexedDoc<T>> {
		return new Promise<IndexedDoc<T>>((resolve, reject) => {
			this.getMany([id])
				.then((docs) => resolve(docs[0]))
				.catch((error) => reject(error));
		});
	}

	updateMany(docs: T[]): Promise<DocStatus[]> {
		const encodedDocs = docs.map((d) => this.encodedDoc(d));
		return this.driver.updateMany(this.name, encodedDocs);
	}

	updateOne(doc: T): Promise<DocStatus> {
		return new Promise<DocStatus>((resolve, reject) => {
			this.updateMany([doc])
				.then((docStatuses) => resolve(docStatuses[0]))
				.catch((error) => reject(error));
		});
	}

	/**
	 * Search for documents in an Index. Easily perform sophisticated queries and refine
	 * results using filters with advanced features like faceting and ordering.
	 *
	 * @param query - Search query to execute
	 * @returns {@link SearchIterator} - To iterate over pages of {@link SearchResult}
	 *
	 * @example
	 * ```
	 * const iterator = client.getIndex<Book>("books").search(query);
	 *
	 * for await (const resultPage of iterator) {
	 *   console.log(resultPage.hits);
	 *   console.log(resultPage.facets);
	 * }
	 * ```
	 */
	search(query: SearchQuery<T>): SearchCursor<T>;

	/**
	 * Search for documents in a collection. Easily perform sophisticated queries and refine
	 * results using filters with advanced features like faceting and ordering.
	 *
	 * @param query - Search query to execute
	 * @param page - Page number to retrieve. Page number `1` fetches the first page of search results.
	 * @returns - Single page of results wrapped in a Promise
	 *
	 * @example To retrieve page number 5 of matched documents
	 * ```
	 * const resultPromise = client.getIndex<Book>("books").search(query, 5);
	 *
	 * resultPromise
	 * 		.then((res: SearchResult<Book>) => console.log(res.hits))
	 * 		.catch( // catch the error)
	 * 		.finally( // finally do something);
	 *
	 * ```
	 */
	search(query: SearchQuery<T>, page: number): Promise<SearchResult<T>>;

	search(query: SearchQuery<T>, page?: number): SearchCursor<T> | Promise<SearchResult<T>> {
		return this.driver.search(this.name, query, page);
	}

	private encodedDoc(doc: T): Uint8Array {
		return Utility.stringToUint8Array(Utility.objToJsonString(doc));
	}
}
