import * as grpc from "@grpc/grpc-js";
import { TigrisClient } from "./proto/server/v1/api_grpc_pb";
import {
	InsertRequest as ProtoInsertRequest,
	InsertRequestOptions as ProtoInsertRequestOptions,
	ReadRequest as ProtoReadRequest,
	ReadResponse as ProtoReadResponse,
	ReadRequestOptions as ProtoReadRequestOptions,
	DeleteRequest as ProtoDeleteRequest,
	UpdateRequest as ProtoUpdateRequest,
	WriteOptions as ProtoWriteOptions,
	DeleteRequestOptions as ProtoDeleteRequestOptions,
	UpdateRequestOptions as ProtoUpdateRequestOptions,
} from "./proto/server/v1/api_pb";
import { Session } from "./session";
import {
	DeleteRequestOptions,
	DeleteResponse,
	DMLMetadata,
	Filter,
	InsertOptions,
	InsertResponse,
	LogicalFilter,
	ReadFields,
	TigrisCollectionType,
	UpdateFields,
	UpdateRequestOptions,
	UpdateResponse,
} from "./types";
import { Utility } from "./utility";

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

	insertMany(tx?: Session, _options?: InsertOptions, ...docs: Array<T>): Promise<InsertResponse> {
		return new Promise<InsertResponse>((resolve, reject) => {
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
					const metadata: DMLMetadata = new DMLMetadata(
						response.getMetadata().getCreatedAt(),
						response.getMetadata().getUpdatedAt()
					);
					resolve(new InsertResponse(response.getStatus(), metadata));
				}
			});
		});
	}

	insert(doc: T, tx?: Session, options?: InsertOptions): Promise<InsertResponse> {
		return this.insertMany(tx, options, doc);
	}

	readOne(
		filter: Filter | LogicalFilter,
		readFields?: ReadFields,
		tx?: Session
	): Promise<T | void> {
		return new Promise<T | void>((resolve, reject) => {
			const readRequest = new ProtoReadRequest()
				.setDb(this._db)
				.setCollection(this._collectionName)
				.setOptions(new ProtoReadRequestOptions().setLimit(1))
				.setFilter(Utility.stringToUint8Array(Utility.filterString(filter)));

			if (readFields) {
				readRequest.setFields(Utility.stringToUint8Array(Utility.readFieldString(readFields)));
			}

			if (tx) {
				readRequest.setOptions(new ProtoReadRequestOptions().setTxCtx(Utility.txApiToProto(tx)));
			}

			const stream: grpc.ClientReadableStream<ProtoReadResponse> = this._grpcClient.read(
				readRequest,
				Utility.txToMetadata(tx)
			);

			stream.on("data", (readResponse: ProtoReadResponse) => {
				const doc = JSON.parse(
					Buffer.from(readResponse.getData_asB64(), "base64").toString("binary")
				);
				resolve(doc);
			});

			stream.on("error", reject);

			stream.on("end", () => {
				resolve();
			});
		});
	}

	read(
		filter: Filter | LogicalFilter,
		reader: ReaderCallback<T>,
		readFields?: ReadFields,
		tx?: Session
	) {
		const readRequest = new ProtoReadRequest()
			.setDb(this._db)
			.setCollection(this._collectionName)
			.setFilter(Utility.stringToUint8Array(Utility.filterString(filter)));

		if (readFields) {
			readRequest.setFields(Utility.stringToUint8Array(Utility.readFieldString(readFields)));
		}

		if (tx) {
			readRequest.setOptions(new ProtoReadRequestOptions().setTxCtx(Utility.txApiToProto(tx)));
		}

		const stream: grpc.ClientReadableStream<ProtoReadResponse> = this._grpcClient.read(
			readRequest,
			Utility.txToMetadata(tx)
		);

		stream.on("data", (readResponse: ProtoReadResponse) => {
			const doc: T = Utility.jsonStringToObj<T>(
				Buffer.from(readResponse.getData_asB64(), "base64").toString("binary")
			);
			reader.onNext(doc);
		});

		stream.on("error", (error) => reader.onError(error));
		stream.on("end", () => reader.onEnd());
	}

	delete(
		filter: Filter | LogicalFilter,
		tx?: Session,
		_options?: DeleteRequestOptions
	): Promise<DeleteResponse> {
		return new Promise<DeleteResponse>((resolve, reject) => {
			const deleteRequest = new ProtoDeleteRequest()
				.setDb(this._db)
				.setCollection(this._collectionName)
				.setFilter(Utility.stringToUint8Array(Utility.filterString(filter)));

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
		filter: Filter | LogicalFilter,
		fields: UpdateFields,
		tx?: Session,
		_options?: UpdateRequestOptions
	): Promise<UpdateResponse> {
		return new Promise<UpdateResponse>((resolve, reject) => {
			const updateRequest = new ProtoUpdateRequest()
				.setDb(this._db)
				.setCollection(this._collectionName)
				.setFilter(Utility.stringToUint8Array(Utility.filterString(filter)))
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
