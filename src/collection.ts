import * as grpc from "@grpc/grpc-js";
import { TigrisClient } from "./proto/server/v1/api_grpc_pb";
import * as server_v1_api_pb from "./proto/server/v1/api_pb";
import {
	Collation,
	DeleteRequest as ProtoDeleteRequest,
	EventsRequest as ProtoEventsRequest,
	EventsResponse as ProtoEventsResponse,
	InsertRequest as ProtoInsertRequest,
	ReadRequest as ProtoReadRequest,
	ReadRequestOptions as ProtoReadRequestOptions,
	ReadResponse as ProtoReadResponse,
	ReplaceRequest as ProtoReplaceRequest,
	SearchRequest as ProtoSearchRequest,
	SearchResponse as ProtoSearchResponse,
	UpdateRequest as ProtoUpdateRequest,
} from "./proto/server/v1/api_pb";
import { Session } from "./session";
import {
	DeleteRequestOptions,
	DeleteResponse,
	DMLMetadata,
	EventsRequestOptions,
	InsertOptions,
	InsertOrReplaceOptions,
	LogicalFilter,
	ReadFields,
	ReadRequestOptions,
	Selector,
	SelectorFilter,
	SelectorFilterOperator,
	SimpleUpdateField,
	StreamEvent,
	TigrisCollectionType,
	UpdateFields,
	UpdateRequestOptions,
	UpdateResponse,
} from "./types";
import { Utility } from "./utility";
import {
	MATCH_ALL_QUERY_STRING,
	SearchRequest,
	SearchRequestOptions,
	SearchResult,
} from "./search/types";

export interface ReaderCallback<T> {
	onNext(doc: T): void;

	onEnd(): void;

	onError(error: Error): void;
}

export interface SearchResultCallback<T> {
	onNext(result: SearchResult<T>): void;

	onEnd(): void;

	onError(error: Error): void;
}

export interface EventsCallback<T> {
	onNext(event: StreamEvent<T>): void;

	onEnd(): void;

	onError(error: Error): void;
}

export class Collection<T extends TigrisCollectionType> {
	private readonly _collectionName: string;
	private readonly _db: string;
	private readonly _grpcClient: TigrisClient;

	constructor(collectionName: string, db: string, grpcClient: TigrisClient) {
		this._collectionName = collectionName;
		this._db = db;
		this._grpcClient = grpcClient;
	}

	get collectionName(): string {
		return this._collectionName;
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	insertMany(docs: Array<T>, tx?: Session, _options?: InsertOptions): Promise<Array<T>> {
		return new Promise<Array<T>>((resolve, reject) => {
			const docsArray = new Array<Uint8Array | string>();
			for (const doc of docs) {
				docsArray.push(new TextEncoder().encode(Utility.objToJsonString(doc)));
			}

			const protoRequest = new ProtoInsertRequest()
				.setDb(this._db)
				.setCollection(this._collectionName)
				.setDocumentsList(docsArray);

			this._grpcClient.insert(
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
								Utility.uint8ArrayToString(value)
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

	insert(doc: T, tx?: Session, options?: InsertOptions): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			const docArr: Array<T> = new Array<T>();
			docArr.push(doc);
			this.insertMany(docArr, tx, options)
				.then((docs) => {
					resolve(docs[0]);
				})
				.catch((error) => {
					reject(error);
				});
		});
	}

	insertOrReplaceMany(
		docs: Array<T>,
		tx?: Session,
		options?: InsertOrReplaceOptions // eslint-disable-line @typescript-eslint/no-unused-vars
	): Promise<Array<T>> {
		return new Promise<Array<T>>((resolve, reject) => {
			const docsArray = new Array<Uint8Array | string>();
			for (const doc of docs) {
				docsArray.push(new TextEncoder().encode(Utility.objToJsonString(doc)));
			}
			const protoRequest = new ProtoReplaceRequest()
				.setDb(this._db)
				.setCollection(this._collectionName)
				.setDocumentsList(docsArray);

			this._grpcClient.replace(
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
								Utility.uint8ArrayToString(value)
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

	insertOrReplace(doc: T, tx?: Session, options?: InsertOptions): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			const docArr: Array<T> = new Array<T>();
			docArr.push(doc);
			this.insertOrReplaceMany(docArr, tx, options)
				.then((docs) => resolve(docs[0]))
				.catch((error) => reject(error));
		});
	}

	findOne(
		filter: SelectorFilter<T> | LogicalFilter<T> | Selector<T>,
		tx?: Session,
		readFields?: ReadFields
	): Promise<T | undefined> {
		return new Promise<T>((resolve, reject) => {
			const readRequest = new ProtoReadRequest()
				.setDb(this._db)
				.setCollection(this._collectionName)
				.setOptions(new ProtoReadRequestOptions().setLimit(1))
				.setFilter(Utility.stringToUint8Array(Utility.filterToString(filter)));

			if (readFields) {
				readRequest.setFields(Utility.stringToUint8Array(Utility.readFieldString(readFields)));
			}

			const stream: grpc.ClientReadableStream<ProtoReadResponse> = this._grpcClient.read(
				readRequest,
				Utility.txToMetadata(tx)
			);

			stream.on("data", (readResponse: ProtoReadResponse) => {
				const doc = JSON.parse(Utility._base64Decode(readResponse.getData_asB64()));
				resolve(doc);
			});

			stream.on("error", reject);

			stream.on("end", () => {
				/* eslint unicorn/no-useless-undefined: ["error", {"checkArguments": false}]*/
				resolve(undefined);
			});
		});
	}

	findMany(
		filter: SelectorFilter<T> | LogicalFilter<T> | Selector<T>,
		readFields?: ReadFields,
		tx?: Session,
		options?: ReadRequestOptions
	): Promise<Array<T>> {
		return new Promise<Array<T>>((resolve, reject) => {
			if (options === undefined) {
				options = new ReadRequestOptions();
			}
			const result: Array<T> = new Array<T>();
			this.findManyStream(
				{
					onEnd() {
						resolve(result);
					},
					onNext(item: T) {
						result.push(item);
					},
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					onError(_error: Error) {
						reject(_error);
					},
				},
				filter,
				readFields,
				tx,
				options
			);
		});
	}

	findManyStream(
		reader: ReaderCallback<T>,
		filter?: SelectorFilter<T> | LogicalFilter<T> | Selector<T>,
		readFields?: ReadFields,
		tx?: Session,
		options?: ReadRequestOptions
	) {
		// if no filter is supplied, read all
		if (filter === undefined) {
			filter = {
				op: SelectorFilterOperator.NONE,
			};
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

		const stream: grpc.ClientReadableStream<ProtoReadResponse> = this._grpcClient.read(
			readRequest,
			Utility.txToMetadata(tx)
		);

		stream.on("data", (readResponse: ProtoReadResponse) => {
			const doc: T = Utility.jsonStringToObj<T>(
				Utility._base64Decode(readResponse.getData_asB64())
			);
			reader.onNext(doc);
		});

		stream.on("error", (error) => reader.onError(error));
		stream.on("end", () => reader.onEnd());
	}

	search(
		request: SearchRequest<T>,
		options?: SearchRequestOptions
	): Promise<Array<SearchResult<T>>> {
		return new Promise<Array<SearchResult<T>>>((resolve, reject) => {
			const result: Array<SearchResult<T>> = new Array<SearchResult<T>>();
			this.searchStream(
				request,
				{
					onNext(searchResult: SearchResult<T>) {
						result.push(searchResult);
					},
					onEnd() {
						resolve(result);
					},
					onError(error: Error) {
						reject(error);
					},
				},
				options
			);
		});
	}

	searchStream(
		request: SearchRequest<T>,
		reader: SearchResultCallback<T>,
		options?: SearchRequestOptions
	) {
		const searchRequest = new ProtoSearchRequest()
			.setDb(this._db)
			.setCollection(this._collectionName)
			.setQ(request.q ?? MATCH_ALL_QUERY_STRING);

		if (request.searchFields !== undefined) {
			searchRequest.setSearchFieldsList(request.searchFields);
		}

		if (request.filter !== undefined) {
			searchRequest.setFilter(Utility.stringToUint8Array(Utility.filterToString(request.filter)));
		}

		if (request.facets !== undefined) {
			searchRequest.setFacet(
				Utility.stringToUint8Array(Utility.facetQueryToString(request.facets))
			);
		}

		if (request.sort !== undefined) {
			searchRequest.setSort(Utility.stringToUint8Array(Utility.sortOrderingToString(request.sort)));
		}

		if (request.includeFields !== undefined) {
			searchRequest.setIncludeFieldsList(request.includeFields);
		}

		if (request.excludeFields !== undefined) {
			searchRequest.setIncludeFieldsList(request.excludeFields);
		}

		if (options !== undefined) {
			searchRequest.setPage(options.page).setPageSize(options.perPage);
			if (options.collation !== undefined) {
				searchRequest.setCollation(new Collation().setCase(options.collation.case));
			}
		}

		const stream: grpc.ClientReadableStream<ProtoSearchResponse> =
			this._grpcClient.search(searchRequest);
		stream.on("data", (searchResponse: ProtoSearchResponse) => {
			const searchResult: SearchResult<T> = SearchResult.from(searchResponse);
			reader.onNext(searchResult);
		});
		stream.on("error", (error) => reader.onError(error));
		stream.on("end", () => reader.onEnd());
	}

	delete(
		filter: SelectorFilter<T> | LogicalFilter<T> | Selector<T>,
		tx?: Session,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		_options?: DeleteRequestOptions
	): Promise<DeleteResponse> {
		return new Promise<DeleteResponse>((resolve, reject) => {
			if (!filter) {
				reject(new Error("No filter specified"));
			}
			const deleteRequest = new ProtoDeleteRequest()
				.setDb(this._db)
				.setCollection(this._collectionName)
				.setFilter(Utility.stringToUint8Array(Utility.filterToString(filter)));

			this._grpcClient.delete(deleteRequest, Utility.txToMetadata(tx), (error, response) => {
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

	update(
		filter: SelectorFilter<T> | LogicalFilter<T> | Selector<T>,
		fields: UpdateFields | SimpleUpdateField,
		tx?: Session,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		_options?: UpdateRequestOptions
	): Promise<UpdateResponse> {
		return new Promise<UpdateResponse>((resolve, reject) => {
			const updateRequest = new ProtoUpdateRequest()
				.setDb(this._db)
				.setCollection(this._collectionName)
				.setFilter(Utility.stringToUint8Array(Utility.filterToString(filter)))
				.setFields(Utility.stringToUint8Array(Utility.updateFieldsString(fields)));

			this._grpcClient.update(updateRequest, Utility.txToMetadata(tx), (error, response) => {
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

	events(
		events: EventsCallback<T>,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		_options?: EventsRequestOptions
	) {
		const eventsRequest = new ProtoEventsRequest()
			.setDb(this._db)
			.setCollection(this._collectionName);

		const stream: grpc.ClientReadableStream<ProtoEventsResponse> =
			this._grpcClient.events(eventsRequest);

		stream.on("data", (eventsResponse: ProtoEventsResponse) => {
			const event = eventsResponse.getEvent();
			events.onNext(
				new StreamEvent<T>(
					event.getTxId_asB64(),
					event.getCollection(),
					event.getOp(),
					Utility.jsonStringToObj<T>(Utility._base64Decode(event.getData_asB64())),
					event.getLast()
				)
			);
		});

		stream.on("error", (error) => events.onError(error));
		stream.on("end", () => events.onEnd());
	}
}
