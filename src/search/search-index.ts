import { DocStatus, TigrisIndexType } from "./types";
import { SearchClient } from "../proto/server/v1/search_grpc_pb";
import { TigrisClientConfig } from "../tigris";
import {
	CreateDocumentRequest as ProtoCreateDocumentRequest,
	CreateOrReplaceDocumentRequest as ProtoReplaceRequest,
	DeleteByQueryRequest as ProtoDeleteByQueryRequest,
	DeleteDocumentRequest as ProtoDeleteDocumentRequest,
	GetDocumentRequest as ProtoGetDocumentRequest,
	SearchIndexRequest as ProtoSearchIndexRequest,
	SearchIndexResponse as ProtoSearchIndexResponse,
	UpdateDocumentRequest as ProtoUpdateDocumentRequest,
} from "../proto/server/v1/search_pb";
import { Utility } from "../utility";
import { Filter } from "../types";
import { SearchIndexIteratorInitializer, SearchIterator } from "../consumables/search-iterator";
import * as grpc from "@grpc/grpc-js";
import { Collation as ProtoCollation } from "../proto/server/v1/api_pb";
import { SearchQuery } from "./query";
import { SearchResult } from "./result";

interface SearchableIndex<T> {
	search(query: SearchQuery<T>): SearchIterator<T>;
	search(query: SearchQuery<T>, page: number): Promise<SearchResult<T>>;
	getMany(ids: Array<string>): Promise<Array<T>>;
	getOne(id: string): Promise<T>;
}

interface WritableIndex<T> {
	createMany(docs: Array<T>): Promise<Array<DocStatus>>;
	createOne(doc: T): Promise<DocStatus>;
	createOrReplaceMany(docs: Array<T>): Promise<Array<DocStatus>>;
	createOrReplaceOne(doc: T): Promise<DocStatus>;
	deleteMany(ids: Array<string>): Promise<Array<DocStatus>>;
	deleteOne(id: string): Promise<DocStatus>;
	deleteByQuery(filter: Filter<T>): Promise<number>;
	updateMany(docs: Array<T>): Promise<Array<DocStatus>>;
	updateOne(doc: T): Promise<DocStatus>;
}

export class SearchIndex<T extends TigrisIndexType>
	implements SearchableIndex<T>, WritableIndex<T>
{
	private readonly grpcClient: SearchClient;
	private readonly name: string;
	private readonly config: TigrisClientConfig;

	constructor(client, name, config) {
		this.grpcClient = client;
		this.name = name;
		this.config = config;
	}

	createMany(docs: Array<T>): Promise<Array<DocStatus>> {
		return new Promise<Array<DocStatus>>((resolve, reject) => {
			const createRequest = new ProtoCreateDocumentRequest()
				.setProject(this.config.projectName)
				.setIndex(this.name);
			for (const doc of docs) {
				const encodedDoc = this.encodedDoc(doc);
				createRequest.addDocuments(encodedDoc);
			}
			this.grpcClient.create(createRequest, (error, response) => {
				if (error) {
					reject(error);
					return;
				}
				const status: Array<DocStatus> = response.getStatusList().map((d) => DocStatus.from(d));
				resolve(status);
			});
		});
	}

	createOne(doc: T): Promise<DocStatus> {
		return new Promise<DocStatus>((resolve, reject) => {
			this.createMany([doc])
				.then((docStatuses) => resolve(docStatuses[0]))
				.catch((error) => reject(error));
		});
	}

	deleteMany(ids: Array<string>): Promise<Array<DocStatus>> {
		return new Promise<Array<DocStatus>>((resolve, reject) => {
			const delRequest = new ProtoDeleteDocumentRequest()
				.setProject(this.config.projectName)
				.setIndex(this.name)
				.setIdsList(ids);
			this.grpcClient.delete(delRequest, (error, response) => {
				if (error) {
					reject(error);
					return;
				}
				resolve(response.getStatusList().map((d) => DocStatus.from(d)));
			});
		});
	}

	deleteByQuery(filter: Filter<T>): Promise<number> {
		return new Promise<number>((resolve, reject) => {
			const delRequest = new ProtoDeleteByQueryRequest()
				.setProject(this.config.projectName)
				.setIndex(this.name)
				.setFilter(Utility.stringToUint8Array(Utility.filterToString(filter)));

			this.grpcClient.deleteByQuery(delRequest, (error, response) => {
				if (error) {
					reject(error);
					return;
				}
				resolve(response.getCount());
			});
		});
	}

	deleteOne(id: string): Promise<DocStatus> {
		return new Promise<DocStatus>((resolve, reject) => {
			this.deleteMany([id])
				.then((docStatuses) => resolve(docStatuses[0]))
				.catch((error) => reject(error));
		});
	}

	createOrReplaceMany(docs: Array<T>): Promise<Array<DocStatus>> {
		return new Promise<Array<DocStatus>>((resolve, reject) => {
			const replaceRequest = new ProtoReplaceRequest()
				.setProject(this.config.projectName)
				.setIndex(this.name);

			for (const doc of docs) replaceRequest.addDocuments(this.encodedDoc(doc));

			this.grpcClient.createOrReplace(replaceRequest, (error, response) => {
				if (error) {
					reject(error);
					return;
				}
				resolve(response.getStatusList().map((d) => DocStatus.from(d)));
			});
		});
	}

	createOrReplaceOne(doc: T): Promise<DocStatus> {
		return new Promise<DocStatus>((resolve, reject) => {
			this.createOrReplaceMany([doc])
				.then((docStatuses) => resolve(docStatuses[0]))
				.catch((error) => reject(error));
		});
	}

	getMany(ids: Array<string>): Promise<Array<T>> {
		return new Promise<Array<T>>((resolve, reject) => {
			const getRequest = new ProtoGetDocumentRequest()
				.setProject(this.config.projectName)
				.setIndex(this.name)
				.setIdsList(ids);
			this.grpcClient.get(getRequest, (error, response) => {
				if (error) {
					reject(error);
					return;
				}
				const docs: T[] = response.getDocumentsList().map((d) => {
					return Utility.jsonStringToObj<T>(Utility._base64Decode(d.getDoc_asB64()), this.config);
				});
				resolve(docs);
			});
		});
	}

	getOne(id: string): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			this.getMany([id])
				.then((docs) => resolve(docs[0]))
				.catch((error) => reject(error));
		});
	}

	updateMany(docs: Array<T>): Promise<Array<DocStatus>> {
		return new Promise<Array<DocStatus>>((resolve, reject) => {
			const updateRequest = new ProtoUpdateDocumentRequest()
				.setProject(this.config.projectName)
				.setIndex(this.name);
			for (const doc of docs) updateRequest.addDocuments(this.encodedDoc(doc));

			this.grpcClient.update(updateRequest, (error, response) => {
				if (error) {
					reject(error);
				}
				resolve(response.getStatusList().map((d) => DocStatus.from(d)));
			});
		});
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
	search(query: SearchQuery<T>): SearchIterator<T>;

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

	search(query: SearchQuery<T>, page?: number): SearchIterator<T> | Promise<SearchResult<T>> {
		const searchRequest = new ProtoSearchIndexRequest()
			.setProject(this.config.projectName)
			.setIndex(this.name);

		if (query.searchFields !== undefined) {
			searchRequest.setSearchFieldsList(query.searchFields);
		}

		if (query.filter !== undefined) {
			searchRequest.setFilter(Utility.stringToUint8Array(Utility.filterToString(query.filter)));
		}

		if (query.facets !== undefined) {
			searchRequest.setFacet(Utility.stringToUint8Array(Utility.facetQueryToString(query.facets)));
		}

		if (query.sort !== undefined) {
			searchRequest.setSort(Utility.stringToUint8Array(Utility._sortOrderingToString(query.sort)));
		}

		if (query.includeFields !== undefined) {
			searchRequest.setIncludeFieldsList(query.includeFields);
		}

		if (query.excludeFields !== undefined) {
			searchRequest.setExcludeFieldsList(query.excludeFields);
		}

		if (query.hitsPerPage !== undefined) {
			searchRequest.setPageSize(query.hitsPerPage);
		}

		if (query.options?.collation !== undefined) {
			searchRequest.setCollation(new ProtoCollation().setCase(query.options.collation.case));
		}

		if (page !== undefined) {
			searchRequest.setPage(page);
		}

		// return a iterator if no explicit page number is specified
		if (typeof page === "undefined") {
			const initializer = new SearchIndexIteratorInitializer(this.grpcClient, searchRequest);
			return new SearchIterator<T>(initializer, this.config);
		} else {
			return new Promise<SearchResult<T>>((resolve, reject) => {
				const stream: grpc.ClientReadableStream<ProtoSearchIndexResponse> =
					this.grpcClient.search(searchRequest);

				stream.on("data", (searchResponse: ProtoSearchIndexResponse) => {
					const searchResult: SearchResult<T> = SearchResult.from(searchResponse, this.config);
					resolve(searchResult);
				});
				stream.on("error", (error) => reject(error));
				stream.on("end", () => resolve(SearchResult.empty));
			});
		}
	}

	private encodedDoc(doc: T): Uint8Array {
		return Utility.stringToUint8Array(Utility.objToJsonString(doc));
	}
}
