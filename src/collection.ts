import * as grpc from "@grpc/grpc-js";
import {TigrisClient} from "./proto/server/v1/api_grpc_pb";
import {
	DeleteRequest as ProtoDeleteRequest,
	DeleteRequestOptions as ProtoDeleteRequestOptions,
	InsertRequest as ProtoInsertRequest,
	InsertRequestOptions as ProtoInsertRequestOptions,
	ReadRequest as ProtoReadRequest,
	ReadRequestOptions as ProtoReadRequestOptions,
	ReadResponse as ProtoReadResponse,
	ReplaceRequest as ProtoReplaceRequest,
	ReplaceRequestOptions as ProtoReplaceRequestOptions,
	UpdateRequest as ProtoUpdateRequest,
	UpdateRequestOptions as ProtoUpdateRequestOptions,
	WriteOptions as ProtoWriteOptions
} from "./proto/server/v1/api_pb";
import {Session} from "./session";
import {
	DeleteRequestOptions,
	DeleteResponse,
	DMLMetadata,
	InsertOptions,
	InsertOrReplaceOptions,
	LogicalFilter,
	ReadFields,
	ReadRequestOptions,
	SelectorFilter,
	TigrisCollectionType,
	UpdateFields,
	UpdateRequestOptions,
	UpdateResponse,
} from "./types";
import {Utility} from "./utility";

export interface ReaderCallback<T> {
	onNext(doc: T): void;

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

			if (tx) {
				if (protoRequest.getOptions()) {
					if (protoRequest.getOptions().getWriteOptions()) {
						protoRequest.getOptions().getWriteOptions().setTxCtx(Utility.txApiToProto(tx));
					} else {
						protoRequest
							.getOptions()
							.setWriteOptions(new ProtoWriteOptions().setTxCtx(Utility.txApiToProto(tx)));
					}
				} else {
					protoRequest.setOptions(
						new ProtoInsertRequestOptions().setWriteOptions(
							new ProtoWriteOptions().setTxCtx(Utility.txApiToProto(tx))
						)
					);
				}
			}

			this._grpcClient.insert(protoRequest, Utility.txToMetadata(tx), (error, response) => {
				if (error) {
					reject(error);
				} else {
					let docIndex = 0;
					const clonedDocs: T[] = Object.assign([], docs);

					for (const value of response.getKeysList_asU8()) {
						const keyValueJsonObj: object = Utility.jsonStringToObj(Utility.uint8ArrayToString(value));
						for (const fieldName of Object.keys(keyValueJsonObj)) {
							Reflect.set(clonedDocs[docIndex], fieldName, keyValueJsonObj[fieldName])
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
				resolve(docs[0])
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
				.setDocumentsList(docsArray)

			if (tx) {
				if (protoRequest.getOptions()) {
					if (protoRequest.getOptions().getWriteOptions()) {
						protoRequest.getOptions().getWriteOptions().setTxCtx(Utility.txApiToProto(tx));
					} else {
						protoRequest
							.getOptions()
							.setWriteOptions(new ProtoWriteOptions().setTxCtx(Utility.txApiToProto(tx)));
					}
				} else {
					protoRequest.setOptions(
						new ProtoReplaceRequestOptions().setWriteOptions(
							new ProtoWriteOptions().setTxCtx(Utility.txApiToProto(tx))
						)
					);
				}
			}
			this._grpcClient.replace(protoRequest, (error, response) => {
				if (error) {
					reject(error)
				} else {
					let docIndex = 0;
					const clonedDocs: T[] = Object.assign([], docs);
					for (const value of response.getKeysList_asU8()) {
						const keyValueJsonObj: object = Utility.jsonStringToObj(Utility.uint8ArrayToString(value));
						for (const fieldName of Object.keys(keyValueJsonObj)) {
							Reflect.set(clonedDocs[docIndex], fieldName, keyValueJsonObj[fieldName])
							docIndex++;
						}
					}
					resolve(clonedDocs);
				}
			});
		});
	}

	insertOrReplace(doc: T, tx?: Session, options?: InsertOptions): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			this.insertOrReplaceMany(tx, options, doc)
				.then(docs => resolve(docs[0]))
				.catch(error => reject(error))
		});
	}

	readOne(
		filter: SelectorFilter<T> | LogicalFilter<T>,
		readFields?: ReadFields,
		tx?: Session
	): Promise<T | void> {
		return new Promise<T | void>((resolve, reject) => {
			const readRequest = new ProtoReadRequest()
				.setDb(this._db)
				.setCollection(this._collectionName)
				.setOptions(new ProtoReadRequestOptions().setLimit(1))
				.setFilter(Utility.stringToUint8Array(Utility.filterToString(filter)));

			if (readFields) {
				readRequest.setFields(Utility.stringToUint8Array(Utility.readFieldString(readFields)));
			}

			if (tx) {
				readRequest.getOptions().setTxCtx(Utility.txApiToProto(tx));
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
				resolve();
			});
		});
	}

	read(
		filter: SelectorFilter<T> | LogicalFilter<T>,
		reader: ReaderCallback<T>,
		readFields?: ReadFields,
		tx?: Session,
		options?: ReadRequestOptions
	) {
		const readRequest = new ProtoReadRequest()
			.setDb(this._db)
			.setCollection(this._collectionName)
			.setFilter(Utility.stringToUint8Array(Utility.filterToString(filter)));

		if (readFields) {
			readRequest.setFields(Utility.stringToUint8Array(Utility.readFieldString(readFields)));
		}

		if (tx) {
			readRequest.setOptions(new ProtoReadRequestOptions().setTxCtx(Utility.txApiToProto(tx)));
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
				readRequest.getOptions().setOffset(Utility.stringToUint8Array(options.offset))
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

	delete(
		filter: SelectorFilter<T> | LogicalFilter<T>,
		tx?: Session,
		_options?: DeleteRequestOptions
	): Promise<DeleteResponse> {
		return new Promise<DeleteResponse>((resolve, reject) => {
			const deleteRequest = new ProtoDeleteRequest()
				.setDb(this._db)
				.setCollection(this._collectionName)
				.setFilter(Utility.stringToUint8Array(Utility.filterToString(filter)));

			if (tx) {
				deleteRequest.setOptions(
					new ProtoDeleteRequestOptions().setWriteOptions(
						new ProtoWriteOptions().setTxCtx(Utility.txApiToProto(tx))
					)
				);
			}

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
		filter: SelectorFilter<T> | LogicalFilter<T>,
		fields: UpdateFields,
		tx?: Session,
		_options?: UpdateRequestOptions
	): Promise<UpdateResponse> {
		return new Promise<UpdateResponse>((resolve, reject) => {
			const updateRequest = new ProtoUpdateRequest()
				.setDb(this._db)
				.setCollection(this._collectionName)
				.setFilter(Utility.stringToUint8Array(Utility.filterToString(filter)))
				.setFields(Utility.stringToUint8Array(Utility.updateFieldsString(fields)));

			if (tx) {
				updateRequest.setOptions(
					new ProtoUpdateRequestOptions().setWriteOptions(
						new ProtoWriteOptions().setTxCtx(Utility.txApiToProto(tx))
					)
				);
			}

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
}
