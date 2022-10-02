import * as grpc from "@grpc/grpc-js";
import { TigrisClient } from "./proto/server/v1/api_grpc_pb";
import * as server_v1_api_pb from "./proto/server/v1/api_pb";
import {
	DeleteRequest as ProtoDeleteRequest,
	EventsRequest as ProtoEventsRequest,
	EventsResponse as ProtoEventsResponse,
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
	StreamEvent,
	TigrisCollectionType,
	UpdateFields,
	UpdateRequestOptions,
	UpdateResponse,
} from "./types";
import { Utility } from "./utility";
import { SearchRequest, SearchRequestOptions, SearchResult } from "./search/types";
import { TigrisClientConfig } from "./tigris";
import { Cursor, ReadCursorInitializer } from "./cursor/cursor";

/**
 * Callback to receive events from server
 */
export interface EventsCallback<T> {
	/**
	 * Receives a message from server. Can be called many times but is never called after
	 * {@link onError} or {@link onEnd} are called.
	 *
	 * <p>If an exception is thrown by an implementation, the caller is expected to terminate the
	 * stream by calling {@link onError} with the caught exception prior to propagating it.
	 *
	 * @param event
	 */
	onNext(event: StreamEvent<T>): void;

	/**
	 * Receives a notification of successful stream completion.
	 *
	 * <p>May only be called once and if called it must be the last method called. In particular,
	 * if an exception is thrown by an implementation of {@link onEnd} no further calls to any
	 * method are allowed.
	 */
	onEnd(): void;

	/**
	 * Receives terminating error from the stream.
	 * @param error
	 */
	onError(error: Error): void;
}

/**
 * The **Collection** class represents Tigris collection allowing insert/find/update/delete/search
 * and events operations.
 */
export class Collection<T extends TigrisCollectionType> {
	private readonly _collectionName: string;
	private readonly _db: string;
	private readonly grpcClient: TigrisClient;
	private readonly config: TigrisClientConfig;

	constructor(
		collectionName: string,
		db: string,
		grpcClient: TigrisClient,
		config: TigrisClientConfig
	) {
		this._collectionName = collectionName;
		this._db = db;
		this.grpcClient = grpcClient;
		this.config = config;
	}

	/**
	 * Name of this collection
	 */
	get collectionName(): string {
		return this._collectionName;
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
				.setDb(this._db)
				.setCollection(this._collectionName)
				.setDocumentsList(docsArray);

			this.grpcClient.insert(
				protoRequest,
				Utility.txToMetadata(tx),
				(error: grpc.ServiceError, response: server_v1_api_pb.InsertResponse): void => {
					if (error !== undefined && error !== null) {
						reject(error);
					} else {
						let docIndex = 0;
						const clonedDocs: T[] = Object.assign([], docs);

						for (const value of response.getKeysList_asU8()) {
							const keyValueJsonObj: object = Utility.jsonStringToObj(
								Utility.uint8ArrayToString(value),
								this.config
							);
							for (const fieldName of Object.keys(keyValueJsonObj)) {
								Reflect.set(clonedDocs[docIndex], fieldName, keyValueJsonObj[fieldName]);
								docIndex++;
							}
						}
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
				.setDb(this._db)
				.setCollection(this._collectionName)
				.setDocumentsList(docsArray);

			this.grpcClient.replace(
				protoRequest,
				Utility.txToMetadata(tx),
				(error: grpc.ServiceError, response: server_v1_api_pb.ReplaceResponse): void => {
					if (error !== undefined && error !== null) {
						reject(error);
					} else {
						let docIndex = 0;
						const clonedDocs: T[] = Object.assign([], docs);
						for (const value of response.getKeysList_asU8()) {
							const keyValueJsonObj: object = Utility.jsonStringToObj(
								Utility.uint8ArrayToString(value),
								this.config
							);
							for (const fieldName of Object.keys(keyValueJsonObj)) {
								Reflect.set(clonedDocs[docIndex], fieldName, keyValueJsonObj[fieldName]);
								docIndex++;
							}
						}
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
			.setDb(this._db)
			.setCollection(this._collectionName)
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
	 * @param options - Optional settings for search
	 */
	search(
		request: SearchRequest<T>,
		options?: SearchRequestOptions
	): Promise<SearchResult<T> | undefined> {
		return new Promise<SearchResult<T>>((resolve, reject) => {
			const searchRequest = Utility.createProtoSearchRequest(
				this._db,
				this.collectionName,
				request,
				// note: explicit page number is required to signal manual pagination
				Utility.createSearchRequestOptions(options)
			);
			const stream: grpc.ClientReadableStream<ProtoSearchResponse> =
				this.grpcClient.search(searchRequest);

			stream.on("data", (searchResponse: ProtoSearchResponse) => {
				const searchResult: SearchResult<T> = SearchResult.from(searchResponse, this.config);
				resolve(searchResult);
			});
			stream.on("error", (error) => reject(error));
			stream.on("end", () => resolve(undefined));
		});
	}

	/**
	 * Search for documents in a collection. Easily perform sophisticated queries and refine
	 * results using filters with advanced features like faceting and ordering.
	 *
	 * @param request - Search query to execute
	 * @param options - Optional settings for search
	 */
	async *searchStream(
		request: SearchRequest<T>,
		options?: SearchRequestOptions
	): AsyncIterableIterator<SearchResult<T>> {
		const searchRequest = Utility.createProtoSearchRequest(
			this._db,
			this.collectionName,
			request,
			options
		);
		const stream: grpc.ClientReadableStream<ProtoSearchResponse> =
			this.grpcClient.search(searchRequest);

		for await (const searchResponse of stream) {
			const searchResult: SearchResult<T> = SearchResult.from(searchResponse, this.config);
			yield searchResult;
		}
		return;
	}

	/**
	 * Deletes documents in collection matching the filter
	 *
	 * @param filter - Query to match documents to delete
	 * @param tx - Optional session information for transaction context
	 * @param options - Optional settings for delete
	 */
	delete(filter: Filter<T>, tx?: Session, options?: DeleteRequestOptions): Promise<DeleteResponse> {
		return new Promise<DeleteResponse>((resolve, reject) => {
			if (!filter) {
				reject(new Error("No filter specified"));
			}
			const deleteRequest = new ProtoDeleteRequest()
				.setDb(this._db)
				.setCollection(this._collectionName)
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
	 * Update multiple documents in collection
	 *
	 * @param filter - Query to match documents to apply update
	 * @param fields - Document fields to update and update operation
	 * @param tx - Optional session information for transaction context
	 * @param options - Optional settings for search
	 */
	update(
		filter: Filter<T>,
		fields: UpdateFields | SimpleUpdateField,
		tx?: Session,
		options?: UpdateRequestOptions
	): Promise<UpdateResponse> {
		return new Promise<UpdateResponse>((resolve, reject) => {
			const updateRequest = new ProtoUpdateRequest()
				.setDb(this._db)
				.setCollection(this._collectionName)
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
					resolve(new UpdateResponse(response.getStatus(), metadata));
				}
			});
		});
	}

	/**
	 * Consume events from a "topic"
	 *
	 * @param callback - Callback to consume events asynchronously
	 */
	events(callback: EventsCallback<T>) {
		const eventsRequest = new ProtoEventsRequest()
			.setDb(this._db)
			.setCollection(this._collectionName);

		const stream: grpc.ClientReadableStream<ProtoEventsResponse> =
			this.grpcClient.events(eventsRequest);

		stream.on("data", (eventsResponse: ProtoEventsResponse) => {
			const event = eventsResponse.getEvent();
			callback.onNext(
				new StreamEvent<T>(
					event.getTxId_asB64(),
					event.getCollection(),
					event.getOp(),
					Utility.jsonStringToObj<T>(Utility._base64Decode(event.getData_asB64()), this.config),
					event.getLast()
				)
			);
		});

		stream.on("error", (error) => callback.onError(error));
		stream.on("end", () => callback.onEnd());
	}
}
