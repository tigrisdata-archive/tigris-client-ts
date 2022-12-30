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
	DeleteRequestOptions,
	DeleteResponse,
	DMLMetadata,
	Filter,
	ReadFields,
	ReadRequestOptions,
	SelectorFilterOperator,
	SimpleUpdateField,
	TigrisCollectionType,
	UpdateFields,
	UpdateRequestOptions,
	UpdateResponse,
} from "./types";
import { Utility } from "./utility";
import { SearchRequest, SearchRequestOptions, SearchResult } from "./search/types";
import { TigrisClientConfig } from "./tigris";
import { Cursor, ReadCursorInitializer } from "./consumables/cursor";
import { SearchIterator, SearchIteratorInitializer } from "./consumables/search-iterator";

interface ICollection {
	readonly collectionName: string;
	readonly db: string;
}

export abstract class ReadOnlyCollection<T extends TigrisCollectionType> implements ICollection {
	readonly collectionName: string;
	readonly db: string;
	readonly grpcClient: TigrisClient;
	readonly config: TigrisClientConfig;

	protected constructor(
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
	/**
	 * Performs a read query on collection and returns a cursor that can be used to iterate over
	 * query results.
	 *
	 * @param filter - Optional filter. If unspecified, then all documents will match the filter
	 * @param readFields - Optional field projection param allows returning only specific document fields in result
	 * @param tx - Optional session information for transaction context
	 * @param options - Optional settings for the find query
	 */
	findMany(
		filter?: Filter<T>,
		readFields?: ReadFields,
		tx?: Session,
		options?: ReadRequestOptions
	): Cursor<T> {
		// find all
		if (filter === undefined) {
			filter = { op: SelectorFilterOperator.NONE };
		}

		const readRequest = new ProtoReadRequest()
			.setProject(this.db)
			.setCollection(this.collectionName)
			.setFilter(Utility.stringToUint8Array(Utility.filterToString(filter)));

		if (readFields) {
			readRequest.setFields(Utility.stringToUint8Array(Utility.readFieldString(readFields)));
		}

		if (options !== undefined) {
			readRequest.setOptions(Utility._readRequestOptionsToProtoReadRequestOptions(options));
		}

		const initializer = new ReadCursorInitializer(this.grpcClient, readRequest, tx);
		return new Cursor<T>(initializer, this.config);
	}

	/**
	 * Performs a query to find a single document in collection. Returns the document if found, else
	 * null.
	 *
	 * @param filter - Query to match the document
	 * @param readFields - Optional field projection param allows returning only specific document fields in result
	 * @param tx - Optional session information for transaction context
	 * @param options - Optional settings for the find query
	 */
	findOne(
		filter: Filter<T>,
		readFields?: ReadFields,
		tx?: Session,
		options?: ReadRequestOptions
	): Promise<T | undefined> {
		return new Promise<T>((resolve, reject) => {
			if (options === undefined) {
				options = new ReadRequestOptions(1);
			} else {
				options.limit = 1;
			}

			const cursor = this.findMany(filter, readFields, tx, options);
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
	 * @param request - Search query to execute
	 * @returns {@link SearchIterator} - To iterate over pages of {@link SearchResult}
	 *
	 * @example
	 * ```
	 * const iterator = db.getCollection<Book>(Book).search(request);
	 *
	 * for await (const resultPage of iterator) {
	 *   console.log(resultPage.hits);
	 *   console.log(resultPage.facets);
	 * }
	 * ```
	 */
	search(request: SearchRequest<T>): SearchIterator<T>;

	/**
	 * Search for documents in a collection. Easily perform sophisticated queries and refine
	 * results using filters with advanced features like faceting and ordering.
	 *
	 * @param request - Search query to execute
	 * @param page - Page number to retrieve. Page number `1` fetches the first page of search results.
	 * @returns - Single page of results wrapped in a Promise
	 *
	 * @example To retrieve page number 5 of matched documents
	 * ```
	 * const resultPromise = db.getCollection<Book>(Book).search(request, 5);
	 *
	 * resultPromise
	 * 		.then((res: SearchResult<Book>) => console.log(res.hits))
	 * 		.catch( // catch the error)
	 * 		.finally( // finally do something);
	 *
	 * ```
	 */
	search(request: SearchRequest<T>, page: number): Promise<SearchResult<T>>;

	/**
	 * Search for documents in a collection. Easily perform sophisticated queries and refine
	 * results using filters with advanced features like faceting and ordering.
	 *
	 * @param request - Search query to execute
	 * @param options - Optional settings for search
	 * @returns {@link SearchIterator} - To iterate over pages of {@link SearchResult}
	 *
	 * @example
	 * ```
	 * const iterator = db.getCollection<Book>(Book).search(request, options);
	 *
	 * for await (const resultPage of iterator) {
	 *   console.log(resultPage.hits);
	 *   console.log(resultPage.facets);
	 * }
	 * ```
	 */
	search(request: SearchRequest<T>, options: SearchRequestOptions): SearchIterator<T>;

	/**
	 * Search for documents in a collection. Easily perform sophisticated queries and refine
	 * results using filters with advanced features like faceting and ordering.
	 *
	 * @param request - Search query to execute
	 * @param options - Optional settings for search
	 * @param page - Page number to retrieve. Page number `1` fetches the first page of search results.
	 * @returns - Single page of results wrapped in a Promise
	 *
	 * @example To retrieve page number 5 of matched documents
	 * ```
	 * const resultPromise = db.getCollection<Book>(Book).search(request, options, 5);
	 *
	 * resultPromise
	 * 		.then((res: SearchResult<Book>) => console.log(res.hits))
	 * 		.catch( // catch the error)
	 * 		.finally( // finally do something);
	 *
	 * ```
	 */
	search(
		request: SearchRequest<T>,
		options: SearchRequestOptions,
		page: number
	): Promise<SearchResult<T>>;

	search(
		request: SearchRequest<T>,
		pageOrOptions?: SearchRequestOptions | number,
		page?: number
	): SearchIterator<T> | Promise<SearchResult<T>> {
		let options: SearchRequestOptions;
		if (typeof pageOrOptions !== "undefined") {
			if (typeof pageOrOptions === "number") {
				page = pageOrOptions as number;
			} else {
				options = pageOrOptions as SearchRequestOptions;
			}
		}

		const searchRequest = Utility.createProtoSearchRequest(
			this.db,
			this.collectionName,
			request,
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
}

/**
 * The **Collection** class represents Tigris collection allowing insert/find/update/delete/search
 * operations.
 */
export class Collection<T extends TigrisCollectionType> extends ReadOnlyCollection<T> {
	constructor(
		collectionName: string,
		db: string,
		grpcClient: TigrisClient,
		config: TigrisClientConfig
	) {
		super(collectionName, db, grpcClient, config);
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
	 * @param tx - Optional session information for transaction context
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
	 * @param tx - Optional session information for transaction context
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
	 * @param tx - Optional session information for transaction context
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
	 * @param tx - Optional session information for transaction context
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
	 * Deletes documents in collection matching the filter
	 *
	 * @param filter - Query to match documents to delete
	 * @param tx - Optional session information for transaction context
	 * @param options - Optional settings for delete
	 */
	deleteMany(
		filter: Filter<T>,
		tx?: Session,
		options?: DeleteRequestOptions
	): Promise<DeleteResponse> {
		return new Promise<DeleteResponse>((resolve, reject) => {
			if (!filter) {
				reject(new Error("No filter specified"));
			}
			const deleteRequest = new ProtoDeleteRequest()
				.setProject(this.db)
				.setCollection(this.collectionName)
				.setFilter(Utility.stringToUint8Array(Utility.filterToString(filter)));

			if (options !== undefined) {
				deleteRequest.setOptions(Utility._deleteRequestOptionsToProtoDeleteRequestOptions(options));
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
	 * Deletes a single document in collection matching the filter
	 *
	 * @param filter - Query to match documents to delete
	 * @param tx - Optional session information for transaction context
	 * @param options - Optional settings for delete
	 */
	deleteOne(
		filter: Filter<T>,
		tx?: Session,
		options?: DeleteRequestOptions
	): Promise<DeleteResponse> {
		if (options === undefined) {
			options = new DeleteRequestOptions(1);
		} else {
			options.limit = 1;
		}

		return this.deleteMany(filter, tx, options);
	}

	/**
	 * Update multiple documents in collection
	 *
	 * @param filter - Query to match documents to apply update
	 * @param fields - Document fields to update and update operation
	 * @param tx - Optional session information for transaction context
	 * @param options - Optional settings for search
	 */
	updateMany(
		filter: Filter<T>,
		fields: UpdateFields | SimpleUpdateField,
		tx?: Session,
		options?: UpdateRequestOptions
	): Promise<UpdateResponse> {
		return new Promise<UpdateResponse>((resolve, reject) => {
			const updateRequest = new ProtoUpdateRequest()
				.setProject(this.db)
				.setCollection(this.collectionName)
				.setFilter(Utility.stringToUint8Array(Utility.filterToString(filter)))
				.setFields(Utility.stringToUint8Array(Utility.updateFieldsString(fields)));

			if (options !== undefined) {
				updateRequest.setOptions(Utility._updateRequestOptionsToProtoUpdateRequestOptions(options));
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
	 * Updates a single document in collection
	 *
	 * @param filter - Query to match document to apply update
	 * @param fields - Document fields to update and update operation
	 * @param tx - Optional session information for transaction context
	 * @param options - Optional settings for search
	 */
	updateOne(
		filter: Filter<T>,
		fields: UpdateFields | SimpleUpdateField,
		tx?: Session,
		options?: UpdateRequestOptions
	): Promise<UpdateResponse> {
		if (options === undefined) {
			options = new UpdateRequestOptions(1);
		} else {
			options.limit = 1;
		}
		return this.updateMany(filter, fields, tx, options);
	}
}
