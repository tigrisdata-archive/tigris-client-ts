import * as grpc from "@grpc/grpc-js";
import { TigrisClient } from "./proto/server/v1/api_grpc_pb";
import * as server_v1_api_pb from "./proto/server/v1/api_pb";
import {
	DeleteRequest as ProtoDeleteRequest,
	InsertRequest as ProtoInsertRequest,
	ReadRequest as ProtoReadRequest,
	ReplaceRequest as ProtoReplaceRequest,
	SearchResponse as ProtoSearchResponse,
	UpdateRequest as ProtoUpdateRequest,
} from "./proto/server/v1/api_pb";
import { Session } from "./session";
import {
	DeleteQuery,
	DeleteRequestOptions,
	DeleteResponse,
	DMLMetadata,
	Filter,
	FindQuery,
	ReadRequestOptions,
	SelectorFilterOperator,
	TigrisCollectionType,
	UpdateQuery,
	UpdateRequestOptions,
	UpdateResponse,
} from "./types";
import { Utility } from "./utility";
import { SearchQuery, SearchQueryOptions, SearchResult } from "./search/types";
import { TigrisClientConfig } from "./tigris";
import { Cursor, ReadCursorInitializer } from "./consumables/cursor";
import { SearchIterator, SearchIteratorInitializer } from "./consumables/search-iterator";
import { MissingArgumentError } from "./error";

interface ICollection {
	readonly collectionName: string;
	readonly db: string;
}

/**
 * The **Collection** class represents Tigris collection allowing insert/find/update/delete/search
 * operations.
 * @public
 */
export class Collection<T extends TigrisCollectionType> implements ICollection {
	readonly collectionName: string;
	readonly db: string;
	readonly grpcClient: TigrisClient;
	readonly config: TigrisClientConfig;

	constructor(
		collectionName: string,
		db: string,
		grpcClient: TigrisClient,
		config: TigrisClientConfig
	) {
		this.collectionName = collectionName;
		this.db = db;
		this.grpcClient = grpcClient;
		this.config = config;
	}

	private isTxSession(txOrQuery: Session | unknown): txOrQuery is Session {
		const mayBeTx = txOrQuery as Session;
		return "id" in mayBeTx && mayBeTx instanceof Session;
	}

	/**
	 * Read all the documents from a collection.
	 *
	 * @returns - {@link Cursor} to iterate over documents
	 *
	 * @example
	 * ```
	 * const cursor = db.getCollection<Book>(Book).findMany();
	 *
	 * for await (const document of cursor) {
	 *   console.log(document);
	 * }
	 * ```
	 */
	findMany(): Cursor<T>;

	/**
	 * Reads all the documents from a collection in transactional context.
	 *
	 * @param tx - Session information for Transaction
	 * @returns - {@link Cursor} to iterate over documents
	 *
	 * @example
	 * ```
	 * const cursor = db.getCollection<Book>(Book).findMany(tx);
	 *
	 * for await (const document of cursor) {
	 *   console.log(document);
	 * }
	 * ```
	 */
	findMany(tx: Session): Cursor<T>;

	/**
	 * Performs a read query on collection and returns a cursor that can be used to iterate over
	 * query results.
	 *
	 * @param query - Filter, field projection and other parameters
	 * @returns - {@link Cursor} to iterate over documents
	 *
	 * @example
	 * ```
	 * const cursor = db.getCollection<Book>(Book).findMany({
	 * 		filter: { author: "Marcel Proust" },
	 * 		readFields: { include: ["id", "title"] }
	 * });
	 *
	 * for await (const document of cursor) {
	 *   console.log(document);
	 * }
	 * ```
	 */
	findMany(query: FindQuery<T>): Cursor<T>;

	/**
	 * Performs a read query on collection in transactional context and returns a
	 * cursor that can be used to iterate over query results.
	 *
	 * @param query - Filter, field projection and other parameters
	 * @param tx - Session information for Transaction
	 * @returns - {@link Cursor} to iterate over documents
	 *
	 * @example
	 * ```
	 * const cursor = db.getCollection<Book>(Book).findMany({
	 * 		filter: { author: "Marcel Proust" },
	 * 		readFields: { include: ["id", "title"] }
	 * }, tx);
	 *
	 * for await (const document of cursor) {
	 *   console.log(document);
	 * }
	 * ```
	 */
	findMany(query: FindQuery<T>, tx: Session): Cursor<T>;

	findMany(txOrQuery?: Session | FindQuery<T>, tx?: Session): Cursor<T> {
		let query: FindQuery<T>;
		if (typeof txOrQuery !== "undefined") {
			if (this.isTxSession(txOrQuery)) {
				tx = txOrQuery as Session;
			} else {
				query = txOrQuery as FindQuery<T>;
			}
		}

		const findAll: Filter<T> = { op: SelectorFilterOperator.NONE };

		if (!query) {
			query = { filter: findAll };
		} else if (!query.filter) {
			query.filter = findAll;
		}
		const readRequest = new ProtoReadRequest()
			.setProject(this.db)
			.setCollection(this.collectionName)
			.setFilter(Utility.stringToUint8Array(Utility.filterToString(query.filter)));

		if (query.readFields) {
			readRequest.setFields(Utility.stringToUint8Array(Utility.readFieldString(query.readFields)));
		}

		if (query.options) {
			readRequest.setOptions(Utility._readRequestOptionsToProtoReadRequestOptions(query.options));
		}

		const initializer = new ReadCursorInitializer(this.grpcClient, readRequest, tx);
		return new Cursor<T>(initializer, this.config);
	}

	/**
	 * Read a single document from collection.
	 *
	 * @returns - The document if found else **undefined**
	 *
	 * @example
	 * ```
	 * const documentPromise = db.getCollection<Book>(Book).findOne();
	 *
	 * documentPromise
	 * 		.then((doc: Book | undefined) => console.log(doc));
	 * 		.catch( // catch the error)
	 * 		.finally( // finally do something);
	 * ```
	 */
	findOne(): Promise<T | undefined>;

	/**
	 * Read a single document from collection in transactional context
	 *
	 * @param tx - Session information for Transaction
	 * @returns - The document if found else **undefined**
	 *
	 * @example
	 * ```
	 * const documentPromise = db.getCollection<Book>(Book).findOne(tx);
	 *
	 * documentPromise
	 * 		.then((doc: Book | undefined) => console.log(doc));
	 * 		.catch( // catch the error)
	 * 		.finally( // finally do something);
	 * ```
	 */
	findOne(tx: Session): Promise<T | undefined>;

	/**
	 * Performs a read query on the collection and returns a single document matching
	 * the query.
	 *
	 * @param query - Filter, field projection and other parameters
	 * @returns - The document if found else **undefined**
	 *
	 * @example
	 * ```
	 * const documentPromise = db.getCollection<Book>(Book).findOne({
	 * 		filter: { author: "Marcel Proust" },
	 * 		readFields: { include: ["id", "title"] }
	 * });
	 *
	 * documentPromise
	 * 		.then((doc: Book | undefined) => console.log(doc));
	 * 		.catch( // catch the error)
	 * 		.finally( // finally do something);
	 * ```
	 */
	findOne(query: FindQuery<T>): Promise<T | undefined>;
	/**
	 * Performs a read query on the collection in transactional context and returns
	 * a single document matching the query.
	 *
	 * @param query - Filter, field projection and other parameters
	 * @param tx - Session information for Transaction
	 * @returns - The document if found else **undefined**
	 *
	 * @example
	 * ```
	 * const documentPromise = db.getCollection<Book>(Book).findOne({
	 * 		filter: { author: "Marcel Proust" },
	 * 		readFields: { include: ["id", "title"] }
	 * }, tx);
	 *
	 * documentPromise
	 * 		.then((doc: Book | undefined) => console.log(doc));
	 * 		.catch( // catch the error)
	 * 		.finally( // finally do something);
	 * ```
	 */
	findOne(query: FindQuery<T>, tx: Session): Promise<T | undefined>;

	findOne(txOrQuery?: Session | FindQuery<T>, tx?: Session): Promise<T | undefined> {
		let query: FindQuery<T>;
		return new Promise<T>((resolve, reject) => {
			if (typeof txOrQuery !== "undefined") {
				if (this.isTxSession(txOrQuery)) {
					tx = txOrQuery as Session;
				} else {
					query = txOrQuery as FindQuery<T>;
				}
			}

			const findOnlyOne: ReadRequestOptions = new ReadRequestOptions(1);

			if (!query) {
				query = { options: findOnlyOne };
			} else if (!query.options) {
				query.options = findOnlyOne;
			} else {
				query.options.limit = findOnlyOne.limit;
			}

			const cursor = this.findMany(query, tx);
			const iteratorResult = cursor[Symbol.asyncIterator]().next();
			if (iteratorResult !== undefined) {
				iteratorResult
					.then(
						(r) => resolve(r.value),
						(error) => reject(error)
					)
					.catch(reject);
			} else {
				/* eslint unicorn/no-useless-undefined: ["error", {"checkArguments": false}]*/
				resolve(undefined);
			}
		});
	}

	/**
	 * Search for documents in a collection. Easily perform sophisticated queries and refine
	 * results using filters with advanced features like faceting and ordering.
	 *
	 * @param query - Search query to execute
	 * @returns {@link SearchIterator} - To iterate over pages of {@link SearchResult}
	 *
	 * @example
	 * ```
	 * const iterator = db.getCollection<Book>(Book).search(query);
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
	 * const resultPromise = db.getCollection<Book>(Book).search(query, 5);
	 *
	 * resultPromise
	 * 		.then((res: SearchResult<Book>) => console.log(res.hits))
	 * 		.catch( // catch the error)
	 * 		.finally( // finally do something);
	 *
	 * ```
	 */
	search(query: SearchQuery<T>, page: number): Promise<SearchResult<T>>;

	/**
	 * Search for documents in a collection. Easily perform sophisticated queries and refine
	 * results using filters with advanced features like faceting and ordering.
	 *
	 * @param query - Search query to execute
	 * @param options - Optional settings for search
	 * @returns {@link SearchIterator} - To iterate over pages of {@link SearchResult}
	 *
	 * @example
	 * ```
	 * const iterator = db.getCollection<Book>(Book).search(query, options);
	 *
	 * for await (const resultPage of iterator) {
	 *   console.log(resultPage.hits);
	 *   console.log(resultPage.facets);
	 * }
	 * ```
	 */
	search(query: SearchQuery<T>, options: SearchQueryOptions): SearchIterator<T>;

	/**
	 * Search for documents in a collection. Easily perform sophisticated queries and refine
	 * results using filters with advanced features like faceting and ordering.
	 *
	 * @param query - Search query to execute
	 * @param options - Optional settings for search
	 * @param page - Page number to retrieve. Page number `1` fetches the first page of search results.
	 * @returns - Single page of results wrapped in a Promise
	 *
	 * @example To retrieve page number 5 of matched documents
	 * ```
	 * const resultPromise = db.getCollection<Book>(Book).search(query, options, 5);
	 *
	 * resultPromise
	 * 		.then((res: SearchResult<Book>) => console.log(res.hits))
	 * 		.catch( // catch the error)
	 * 		.finally( // finally do something);
	 *
	 * ```
	 */
	search(
		query: SearchQuery<T>,
		options: SearchQueryOptions,
		page: number
	): Promise<SearchResult<T>>;

	search(
		query: SearchQuery<T>,
		pageOrOptions?: SearchQueryOptions | number,
		page?: number
	): SearchIterator<T> | Promise<SearchResult<T>> {
		let options: SearchQueryOptions;
		if (typeof pageOrOptions !== "undefined") {
			if (typeof pageOrOptions === "number") {
				page = pageOrOptions as number;
			} else {
				options = pageOrOptions as SearchQueryOptions;
			}
		}

		const searchRequest = Utility.createProtoSearchRequest(
			this.db,
			this.collectionName,
			query,
			options,
			page
		);

		// return a iterator if no explicit page number is specified
		if (typeof page === "undefined") {
			const initializer = new SearchIteratorInitializer(this.grpcClient, searchRequest);
			return new SearchIterator<T>(initializer, this.config);
		} else {
			return new Promise<SearchResult<T>>((resolve, reject) => {
				const stream: grpc.ClientReadableStream<ProtoSearchResponse> =
					this.grpcClient.search(searchRequest);

				stream.on("data", (searchResponse: ProtoSearchResponse) => {
					const searchResult: SearchResult<T> = SearchResult.from(searchResponse, this.config);
					resolve(searchResult);
				});
				stream.on("error", (error) => reject(error));
				stream.on("end", () => resolve(SearchResult.empty));
			});
		}
	}

	private setDocsMetadata(docs: Array<T>, keys: Array<Uint8Array>): Array<T> {
		let docIndex = 0;
		const clonedDocs: T[] = Object.assign([], docs);

		for (const value of keys) {
			const keyValueJsonObj: object = Utility.jsonStringToObj(
				Utility.uint8ArrayToString(value),
				this.config
			);
			for (const fieldName of Object.keys(keyValueJsonObj)) {
				Reflect.set(clonedDocs[docIndex], fieldName, keyValueJsonObj[fieldName]);
			}
			docIndex++;
		}

		return clonedDocs;
	}

	/**
	 * Inserts multiple documents in Tigris collection.
	 *
	 * @param docs - Array of documents to insert
	 * @param tx - Session information for transaction context
	 */
	insertMany(docs: Array<T>, tx?: Session): Promise<Array<T>> {
		return new Promise<Array<T>>((resolve, reject) => {
			const docsArray = new Array<Uint8Array | string>();
			for (const doc of docs) {
				docsArray.push(new TextEncoder().encode(Utility.objToJsonString(doc)));
			}

			const protoRequest = new ProtoInsertRequest()
				.setProject(this.db)
				.setCollection(this.collectionName)
				.setDocumentsList(docsArray);

			this.grpcClient.insert(
				protoRequest,
				Utility.txToMetadata(tx),
				(error: grpc.ServiceError, response: server_v1_api_pb.InsertResponse): void => {
					if (error !== undefined && error !== null) {
						reject(error);
					} else {
						const clonedDocs = this.setDocsMetadata(docs, response.getKeysList_asU8());
						resolve(clonedDocs);
					}
				}
			);
		});
	}

	/**
	 * Inserts a single document in Tigris collection.
	 *
	 * @param doc - Document to insert
	 * @param tx - Session information for transaction context
	 */
	insertOne(doc: T, tx?: Session): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			const docArr: Array<T> = new Array<T>();
			docArr.push(doc);
			this.insertMany(docArr, tx)
				.then((docs) => {
					resolve(docs[0]);
				})
				.catch((error) => {
					reject(error);
				});
		});
	}

	/**
	 * Insert new or replace existing documents in collection.
	 *
	 * @param docs - Array of documents to insert or replace
	 * @param tx - Session information for transaction context
	 */
	insertOrReplaceMany(docs: Array<T>, tx?: Session): Promise<Array<T>> {
		return new Promise<Array<T>>((resolve, reject) => {
			const docsArray = new Array<Uint8Array | string>();
			for (const doc of docs) {
				docsArray.push(new TextEncoder().encode(Utility.objToJsonString(doc)));
			}
			const protoRequest = new ProtoReplaceRequest()
				.setProject(this.db)
				.setCollection(this.collectionName)
				.setDocumentsList(docsArray);

			this.grpcClient.replace(
				protoRequest,
				Utility.txToMetadata(tx),
				(error: grpc.ServiceError, response: server_v1_api_pb.ReplaceResponse): void => {
					if (error !== undefined && error !== null) {
						reject(error);
					} else {
						const clonedDocs = this.setDocsMetadata(docs, response.getKeysList_asU8());
						resolve(clonedDocs);
					}
				}
			);
		});
	}

	/**
	 * Insert new or replace an existing document in collection.
	 *
	 * @param doc - Document to insert or replace
	 * @param tx - Session information for transaction context
	 */
	insertOrReplaceOne(doc: T, tx?: Session): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			const docArr: Array<T> = new Array<T>();
			docArr.push(doc);
			this.insertOrReplaceMany(docArr, tx)
				.then((docs) => resolve(docs[0]))
				.catch((error) => reject(error));
		});
	}

	/**
	 * Delete documents from collection matching the query
	 *
	 * @param query - Filter to match documents and other deletion options
	 * @returns {@link DeleteResponse}
	 *
	 * @example
	 *
	 * ```
	 * const deletionPromise = db.getCollection<Book>(Book).deleteMany({
	 * 		filter: { author: "Marcel Proust" }
	 * });
	 *
	 * deletionPromise
	 * 		.then((resp: DeleteResponse) => console.log(resp));
	 * 		.catch( // catch the error)
	 * 		.finally( // finally do something);
	 * ```
	 */
	deleteMany(query: DeleteQuery<T>): Promise<DeleteResponse>;

	/**
	 * Delete documents from collection in transactional context
	 *
	 * @param query - Filter to match documents and other deletion options
	 * @param tx - Session information for transaction context
	 * @returns {@link DeleteResponse}
	 *
	 * @example
	 *
	 * ```
	 * const deletionPromise = db.getCollection<Book>(Book).deleteMany({
	 * 		filter: { author: "Marcel Proust" }
	 * }, tx);
	 *
	 * deletionPromise
	 * 		.then((resp: DeleteResponse) => console.log(resp));
	 * 		.catch( // catch the error)
	 * 		.finally( // finally do something);
	 * ```
	 */
	deleteMany(query: DeleteQuery<T>, tx: Session): Promise<DeleteResponse>;

	deleteMany(query: DeleteQuery<T>, tx?: Session): Promise<DeleteResponse> {
		return new Promise<DeleteResponse>((resolve, reject) => {
			if (typeof query?.filter === "undefined") {
				reject(new MissingArgumentError("filter"));
			}
			const deleteRequest = new ProtoDeleteRequest()
				.setProject(this.db)
				.setCollection(this.collectionName)
				.setFilter(Utility.stringToUint8Array(Utility.filterToString(query.filter)));

			if (query.options) {
				deleteRequest.setOptions(
					Utility._deleteRequestOptionsToProtoDeleteRequestOptions(query.options)
				);
			}

			this.grpcClient.delete(deleteRequest, Utility.txToMetadata(tx), (error, response) => {
				if (error) {
					reject(error);
				} else {
					const metadata: DMLMetadata = new DMLMetadata(
						response.getMetadata().getCreatedAt(),
						response.getMetadata().getUpdatedAt()
					);
					resolve(new DeleteResponse(response.getStatus(), metadata));
				}
			});
		});
	}

	/**
	 * Delete a single document from collection matching the query
	 *
	 * @param query - Filter to match documents and other deletion options
	 * @returns {@link DeleteResponse}
	 *
	 * @example
	 *
	 * ```
	 * const deletionPromise = db.getCollection<Book>(Book).deleteOne({
	 * 		filter: { author: "Marcel Proust" }
	 * });
	 *
	 * deletionPromise
	 * 		.then((resp: DeleteResponse) => console.log(resp));
	 * 		.catch( // catch the error)
	 * 		.finally( // finally do something);
	 * ```
	 */
	deleteOne(query: DeleteQuery<T>): Promise<DeleteResponse>;

	/**
	 * Delete a single document from collection in transactional context
	 *
	 * @param query - Filter to match documents and other deletion options
	 * @param tx - Session information for transaction context
	 * @returns {@link DeleteResponse}
	 *
	 * @example
	 *
	 * ```
	 * const deletionPromise = db.getCollection<Book>(Book).deleteOne({
	 * 		filter: { author: "Marcel Proust" }
	 * }, tx);
	 *
	 * deletionPromise
	 * 		.then((resp: DeleteResponse) => console.log(resp));
	 * 		.catch( // catch the error)
	 * 		.finally( // finally do something);
	 * ```
	 */
	deleteOne(query: DeleteQuery<T>, tx: Session): Promise<DeleteResponse>;

	deleteOne(query: DeleteQuery<T>, tx?: Session): Promise<DeleteResponse> {
		if (query.options === undefined) {
			query.options = new DeleteRequestOptions(1);
		} else {
			query.options.limit = 1;
		}

		return this.deleteMany(query, tx);
	}

	/**
	 * Update multiple documents in a collection
	 *
	 * @param query - Filter to match documents and the update operations. Update
	 * 								will be applied to matching documents only.
	 * @returns {@link UpdateResponse}
	 *
	 * @example To update **language** of all books published by "Marcel Proust"
	 * ```
	 * const updatePromise = db.getCollection<Book>(Book).updateMany({
	 *   filter: { author: "Marcel Proust" },
	 *   fields: { language: "French" }
	 * });
	 *
	 * updatePromise
	 * 		.then((resp: UpdateResponse) => console.log(resp));
	 * 		.catch( // catch the error)
	 * 		.finally( // finally do something);
	 * ```
	 */
	updateMany(query: UpdateQuery<T>): Promise<UpdateResponse>;

	/**
	 * Update multiple documents in a collection in transactional context
	 *
	 * @param query - Filter to match documents and the update operations. Update
	 * 								will be applied to matching documents only.
	 * @param tx - Session information for transaction context
	 * @returns {@link UpdateResponse}
	 *
	 * @example To update **language** of all books published by "Marcel Proust"
	 * ```
	 * const updatePromise = db.getCollection<Book>(Book).updateMany({
	 *   filter: { author: "Marcel Proust" },
	 *   fields: { language: "French" }
	 * }, tx);
	 *
	 * updatePromise
	 * 		.then((resp: UpdateResponse) => console.log(resp));
	 * 		.catch( // catch the error)
	 * 		.finally( // finally do something);
	 * ```
	 */
	updateMany(query: UpdateQuery<T>, tx: Session): Promise<UpdateResponse>;

	updateMany(query: UpdateQuery<T>, tx?: Session): Promise<UpdateResponse> {
		return new Promise<UpdateResponse>((resolve, reject) => {
			const updateRequest = new ProtoUpdateRequest()
				.setProject(this.db)
				.setCollection(this.collectionName)
				.setFilter(Utility.stringToUint8Array(Utility.filterToString(query.filter)))
				.setFields(Utility.stringToUint8Array(Utility.updateFieldsString(query.fields)));

			if (query.options !== undefined) {
				updateRequest.setOptions(
					Utility._updateRequestOptionsToProtoUpdateRequestOptions(query.options)
				);
			}

			this.grpcClient.update(updateRequest, Utility.txToMetadata(tx), (error, response) => {
				if (error) {
					reject(error);
				} else {
					const metadata: DMLMetadata = new DMLMetadata(
						response.getMetadata().getCreatedAt(),
						response.getMetadata().getUpdatedAt()
					);
					resolve(new UpdateResponse(response.getStatus(), response.getModifiedCount(), metadata));
				}
			});
		});
	}

	/**
	 * Update a single document in collection
	 *
	 * @param query - Filter to match the document and the update operations. Update
	 * 								will be applied to matching documents only.
	 * @returns {@link UpdateResponse}
	 *
	 * @example To update **language** of a book published by "Marcel Proust"
	 * ```
	 * const updatePromise = db.getCollection<Book>(Book).updateOne({
	 *   filter: { author: "Marcel Proust" },
	 *   fields: { language: "French" }
	 * });
	 *
	 * updatePromise
	 * 		.then((resp: UpdateResponse) => console.log(resp));
	 * 		.catch( // catch the error)
	 * 		.finally( // finally do something);
	 * ```
	 */
	updateOne(query: UpdateQuery<T>): Promise<UpdateResponse>;

	/**
	 * Update a single document in a collection in transactional context
	 *
	 * @param query - Filter to match the document and update operations. Update
	 * 								will be applied to a single matching document only.
	 * @param tx - Session information for transaction context
	 * @returns {@link UpdateResponse}
	 *
	 * @example To update **language** of a book published by "Marcel Proust"
	 * ```
	 * const updatePromise = db.getCollection<Book>(Book).updateOne({
	 *   filter: { author: "Marcel Proust" },
	 *   fields: { language: "French" }
	 * }, tx);
	 *
	 * updatePromise
	 * 		.then((resp: UpdateResponse) => console.log(resp));
	 * 		.catch( // catch the error)
	 * 		.finally( // finally do something);
	 * ```
	 */
	updateOne(query: UpdateQuery<T>, tx: Session): Promise<UpdateResponse>;

	updateOne(query: UpdateQuery<T>, tx?: Session): Promise<UpdateResponse> {
		if (query.options === undefined) {
			query.options = new UpdateRequestOptions(1);
		} else {
			query.options.limit = 1;
		}
		return this.updateMany(query, tx);
	}
}
