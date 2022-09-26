import * as grpc from "@grpc/grpc-js";
import { TigrisClient } from "./proto/server/v1/api_grpc_pb";
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
import { SearchRequest, SearchRequestOptions, SearchResult } from "./search/types";
import { TigrisClientConfig } from "./tigris";
import { Cursor, ReadCursorInitializer } from "./cursor/cursor";

export interface EventsCallback<T> {
	onNext(event: StreamEvent<T>): void;

	onEnd(): void;

	onError(error: Error): void;
}

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
		_options?: InsertOrReplaceOptions // eslint-disable-line @typescript-eslint/no-unused-vars
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

			const stream: grpc.ClientReadableStream<ProtoReadResponse> = this.grpcClient.read(
				readRequest,
				Utility.txToMetadata(tx)
			);

			stream.on("data", (readResponse: ProtoReadResponse) => {
				const doc: T = Utility.jsonStringToObj(
					Utility._base64Decode(readResponse.getData_asB64()),
					this.config
				);
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
		filter?: SelectorFilter<T> | LogicalFilter<T> | Selector<T>,
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

	events(
		events: EventsCallback<T>,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		_options?: EventsRequestOptions
	) {
		const eventsRequest = new ProtoEventsRequest()
			.setDb(this._db)
			.setCollection(this._collectionName);

		const stream: grpc.ClientReadableStream<ProtoEventsResponse> =
			this.grpcClient.events(eventsRequest);

		stream.on("data", (eventsResponse: ProtoEventsResponse) => {
			const event = eventsResponse.getEvent();
			events.onNext(
				new StreamEvent<T>(
					event.getTxId_asB64(),
					event.getCollection(),
					event.getOp(),
					Utility.jsonStringToObj<T>(Utility._base64Decode(event.getData_asB64()), this.config),
					event.getLast()
				)
			);
		});

		stream.on("error", (error) => events.onError(error));
		stream.on("end", () => events.onEnd());
	}
}
