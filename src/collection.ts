import * as grpc from "@grpc/grpc-js";
import {TigrisClient} from "./proto/server/v1/api_grpc_pb";
import * as server_v1_api_pb from "./proto/server/v1/api_pb";
import {
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
	UpdateRequest as ProtoUpdateRequest
} from "./proto/server/v1/api_pb";
import {Session} from "./session";
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
	SimpleUpdateField,
	StreamEvent,
	TigrisCollectionType,
	UpdateFields,
	UpdateRequestOptions,
	UpdateResponse,
} from "./types";
import {Utility} from "./utility";
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

	insertMany(tx?: Session, _options?: InsertOptions, ...docs: Array<T>): Promise<Array<T>> {
		return new Promise<Array<T>>((resolve, reject) => {
			const docsArray = new Array<Uint8Array | string>();
			for (const doc of docs) {
				docsArray.push(new TextEncoder().encode(Utility.objToJsonString(doc)));
			}

			const protoRequest = new ProtoInsertRequest()
				.setDb(this._db)
				.setCollection(this._collectionName)
				.setDocumentsList(docsArray);

			this._grpcClient.insert(protoRequest, Utility.txToMetadata(tx), (error: grpc.ServiceError, response: server_v1_api_pb.InsertResponse): void => {
				if (error !== undefined && error !== null) {
					reject(error);
				} else {
					let docIndex = 0;
					const clonedDocs: T[] = Object.assign([], docs);

					for (const value of response.getKeysList_asU8()) {
						const keyValueJsonObj: object = Utility.jsonStringToObj(Utility.uint8ArrayToString(value));
						for (const fieldName of Object.keys(keyValueJsonObj)) {
							Reflect.set(clonedDocs[docIndex], fieldName, keyValueJsonObj[fieldName]);
							docIndex++;
						}
					}
					resolve(clonedDocs);
				}
			});
		});
	}

	insert(doc: T, tx?: Session, options?: InsertOptions): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			this.insertMany(tx, options, doc).then(docs => {
				resolve(docs[0]);
			}).catch(error => {
				reject(error);
			});
		});
	}

	insertOrReplaceMany(tx?: Session, options?: InsertOrReplaceOptions, ...docs: Array<T>): Promise<Array<T>> {
		return new Promise<Array<T>>((resolve, reject) => {
			const docsArray = new Array<Uint8Array | string>();
			for (const doc of docs) {
				docsArray.push(new TextEncoder().encode(Utility.objToJsonString(doc)));
			}
			const protoRequest = new ProtoReplaceRequest()
				.setDb(this._db)
				.setCollection(this._collectionName)
				.setDocumentsList(docsArray);

			this._grpcClient.replace(protoRequest, Utility.txToMetadata(tx), (error: grpc.ServiceError, response: server_v1_api_pb.ReplaceResponse): void => {
				if (error !== undefined && error !== null) {
					reject(error);
				} else {
					let docIndex = 0;
					const clonedDocs: T[] = Object.assign([], docs);
					for (const value of response.getKeysList_asU8()) {
						const keyValueJsonObj: object = Utility.jsonStringToObj(Utility.uint8ArrayToString(value));
						for (const fieldName of Object.keys(keyValueJsonObj)) {
							Reflect.set(clonedDocs[docIndex], fieldName, keyValueJsonObj[fieldName]);
							docIndex++;
						}
					}
					resolve(clonedDocs);
				}
			});
		});
	}

	insertOrReplace(doc: T, tx ?: Session, options ?: InsertOptions): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			this.insertOrReplaceMany(tx, options, doc)
				.then(docs => resolve(docs[0]))
				.catch(error => reject(error));
		});
	}

	readOne(
		filter: SelectorFilter<T> | LogicalFilter<T> | Selector<T>,
		tx ?: Session,
		readFields ?: ReadFields,
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

	read(
		filter: SelectorFilter<T> | LogicalFilter<T> | Selector<T>,
		reader: ReaderCallback<T>,
		readFields ?: ReadFields,
		tx ?: Session,
		options ?: ReadRequestOptions
	) {
		const readRequest = new ProtoReadRequest()
			.setDb(this._db)
			.setCollection(this._collectionName)
			.setFilter(Utility.stringToUint8Array(Utility.filterToString(filter)));

		if (readFields) {
			readRequest.setFields(Utility.stringToUint8Array(Utility.readFieldString(readFields)));
		}

		if (options) {
			if (!readRequest.getOptions()) {
				readRequest.setOptions(new ProtoReadRequestOptions());
			}

			if (options.skip) {
				readRequest.getOptions().setSkip(options.skip);
			}

			if (options.limit) {
				readRequest.getOptions().setLimit(options.limit);
			}

			if (options.offset) {
				readRequest.getOptions().setOffset(Utility.stringToUint8Array(options.offset));
			}
		}

		const stream: grpc.ClientReadableStream<ProtoReadResponse> = this._grpcClient.read(
			readRequest,
			Utility.txToMetadata(tx)
		);

		stream.on("data", (readResponse: ProtoReadResponse) => {
			const doc: T = Utility.jsonStringToObj<T>(Utility._base64Decode(readResponse.getData_asB64()));
			reader.onNext(doc);
		});

		stream.on("error", (error) => reader.onError(error));
		stream.on("end", () => reader.onEnd());
	}

	search(request: SearchRequest<T>, reader: SearchResultCallback<T>, options?: SearchRequestOptions) {
		const requestOptions = Utility.createSearchRequestOptions(options);
		const searchRequest = new ProtoSearchRequest()
			.setDb(this._db)
			.setCollection(this._collectionName)
			.setQ(request.q ?? MATCH_ALL_QUERY_STRING)
			.setPage(requestOptions.page)
			.setPageSize(requestOptions.perPage);

		if (request.searchFields !== undefined) {
			searchRequest.setSearchFieldsList(request.searchFields);
		}

		if (request.filter !== undefined) {
			searchRequest.setFilter(
				Utility.stringToUint8Array(
					Utility.filterToString(request.filter)
				));
		}

		if (request.facetQuery !== undefined) {
			searchRequest.setFacet(
				Utility.stringToUint8Array(
					Utility.objToJsonString(request.facetQuery)
				));
		}

		if (request.sort !== undefined) {
			searchRequest.setSort(
				Utility.stringToUint8Array(
					Utility.objToJsonString(request.sort)
				));
		}

		if (request.readFields !== undefined) {
			searchRequest.setFields(
				Utility.stringToUint8Array(
					Utility.readFieldString(request.readFields)
				));
		}

		const stream: grpc.ClientReadableStream<ProtoSearchResponse> = this._grpcClient.search(searchRequest);
		stream.on("data", (searchResponse: ProtoSearchResponse) => {
			const searchResult: SearchResult<T> = SearchResult.from(searchResponse);
			reader.onNext(searchResult);
		});
		stream.on("error", (error) => reader.onError(error));
		stream.on("end", () => reader.onEnd());

	}

	delete(
		filter: SelectorFilter<T> | LogicalFilter<T> | Selector<T>,
		tx ?: Session,
		_options ?: DeleteRequestOptions
	):
		Promise<DeleteResponse> {
		return new Promise<DeleteResponse>((resolve, reject) => {
			if (!filter) {
				reject(new Error('No filter specified'));
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
		fields: (UpdateFields | SimpleUpdateField),
		tx ?: Session,
		_options ?: UpdateRequestOptions
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
		tx ?: Session,
		_options ?: EventsRequestOptions
	) {
		const eventsRequest = new ProtoEventsRequest()
		.setDb(this._db)
		.setCollection(this._collectionName);

		const stream: grpc.ClientReadableStream<ProtoEventsResponse> = this._grpcClient.events(
			eventsRequest,
			Utility.txToMetadata(tx)
		);

		stream.on("data", (eventsResponse: ProtoEventsResponse) => {
			const event = eventsResponse.getEvent();
			events.onNext(new StreamEvent<T>(
				event.getTxId_asB64(),
				event.getCollection(),
				event.getOp(),
				Utility.jsonStringToObj<T>(Utility._base64Decode(event.getData_asB64())),
				event.getLast()
			));
		});

		stream.on("error", (error) => events.onError(error));
		stream.on("end", () => events.onEnd());
	}
}
