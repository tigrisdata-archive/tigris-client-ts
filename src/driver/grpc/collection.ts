import { CollectionDriver } from "../driver";
import { Utility } from "../../utility";
import { TigrisClient } from "../../proto/server/v1/api_grpc_pb";
import * as grpc from "@grpc/grpc-js";
import { ChannelCredentials } from "@grpc/grpc-js";
import {
	DeleteRequest as ProtoDeleteRequest,
	InsertRequest as ProtoInsertRequest,
	ReadRequest as ProtoReadRequest,
	UpdateRequest as ProtoUpdateRequest,
	CountRequest as ProtoCountRequest,
	DescribeCollectionRequest as ProtoDescribeCollectionRequest,
	InsertResponse as ProtoInsertResponse,
	ReplaceResponse as ProtoReplaceResponse,
	ReplaceRequest as ProtoReplaceRequest,
} from "../../proto/server/v1/api_pb";
import { TigrisClientConfig } from "../../tigris";
import {
	CollectionDescription,
	DMLMetadata,
	DeleteQuery,
	DeleteResponse,
	ExplainResponse,
	Filter,
	FindQuery,
	IndexDescription,
	ReadType,
	Session,
	TigrisCollectionType,
	UpdateQuery,
	UpdateResponse,
} from "../../types";
import { GrpcCursor, ReadCursorInitializer } from "./consumables/cursor";
import { GrpcSession } from "./session";

export class GrpcCollectionDriver<T extends TigrisCollectionType> implements CollectionDriver<T> {
	client: TigrisClient;
	config: TigrisClientConfig;
	constructor(config: TigrisClientConfig, channelCredentials: ChannelCredentials) {
		this.config = config;
		this.client = new TigrisClient(config.serverUrl, channelCredentials);
	}

	describe(db: string, branch: string, coll: string): Promise<CollectionDescription> {
		return new Promise((resolve, reject) => {
			const req = new ProtoDescribeCollectionRequest()
				.setProject(db)
				.setBranch(branch)
				.setCollection(coll);

			this.client.describeCollection(req, (error, resp) => {
				if (error) {
					return reject(error);
				}
				const schema = Buffer.from(resp.getSchema_asB64(), "base64").toString();
				const desc = new CollectionDescription(
					coll,
					resp.getMetadata(),
					schema,
					resp.toObject().indexesList as IndexDescription[]
				);

				resolve(desc);
			});
		});
	}

	insertMany(
		db: string,
		branch: string,
		coll: string,
		createdAtNames: string[],
		docs: T[],
		tx?: Session
	): Promise<T[]> {
		const encoder = new TextEncoder();
		return new Promise<T[]>((resolve, reject) => {
			const docsArray: Array<Uint8Array | string> = docs.map((doc) =>
				encoder.encode(Utility.objToJsonString(doc))
			);

			const protoRequest = new ProtoInsertRequest()
				.setProject(db)
				.setBranch(branch)
				.setCollection(coll)
				.setDocumentsList(docsArray);

			this.client.insert(
				protoRequest,
				Utility.txToMetadata(tx as GrpcSession),
				(error: grpc.ServiceError, response: ProtoInsertResponse): void => {
					if (error) {
						reject(error);
					} else {
						let clonedDocs: Array<T>;
						clonedDocs = this.setDocsMetadata(docs, response.getKeysList_asU8());
						if (response.getMetadata().hasCreatedAt()) {
							const createdAt = new Date(
								response.getMetadata()?.getCreatedAt()?.getSeconds() * 1000
							);
							clonedDocs = this.setCreatedAtForDocsIfNotExists(
								clonedDocs,
								createdAt,
								createdAtNames
							);
						}
						resolve(clonedDocs);
					}
				}
			);
		});
	}

	insertOrReplaceMany(
		db: string,
		branch: string,
		coll: string,
		docs: T[],
		tx?: Session
	): Promise<T[]> {
		return new Promise<Array<T>>((resolve, reject) => {
			const docsArray: Array<Uint8Array | string> = docs.map((doc) =>
				new TextEncoder().encode(Utility.objToJsonString(doc))
			);
			const protoRequest = new ProtoReplaceRequest()
				.setProject(db)
				.setBranch(branch)
				.setCollection(coll)
				.setDocumentsList(docsArray);

			this.client.replace(
				protoRequest,
				Utility.txToMetadata(tx as GrpcSession),
				(error: grpc.ServiceError, response: ProtoReplaceResponse): void => {
					if (error) {
						reject(error);
					} else {
						const clonedDocs = this.setDocsMetadata(docs, response.getKeysList_asU8());
						resolve(clonedDocs);
					}
				}
			);
		});
	}

	updateMany(
		db: string,
		branch: string,
		coll: string,
		query: UpdateQuery<T>,
		tx?: Session
	): Promise<UpdateResponse> {
		return new Promise<UpdateResponse>((resolve, reject) => {
			const updateRequest = new ProtoUpdateRequest()
				.setProject(db)
				.setBranch(branch)
				.setCollection(coll)
				.setFilter(Utility.stringToUint8Array(Utility.filterToString(query.filter)))
				.setFields(Utility.stringToUint8Array(Utility.updateFieldsString(query.fields)));

			if (query.options !== undefined) {
				updateRequest.setOptions(
					Utility._updateRequestOptionsToProtoUpdateRequestOptions(query.options)
				);
			}

			this.client.update(
				updateRequest,
				Utility.txToMetadata(tx as GrpcSession),
				(error, response) => {
					if (error) {
						reject(error);
					} else {
						const metadata: DMLMetadata = new DMLMetadata(
							response.getMetadata().getCreatedAt(),
							response.getMetadata().getUpdatedAt()
						);
						resolve(new UpdateResponse(response.getModifiedCount(), metadata));
					}
				}
			);
		});
	}

	deleteMany(
		db: string,
		branch: string,
		coll: string,
		query: DeleteQuery<T>,
		tx?: Session
	): Promise<DeleteResponse> {
		return new Promise<DeleteResponse>((resolve, reject) => {
			const deleteRequest = new ProtoDeleteRequest()
				.setProject(db)
				.setBranch(branch)
				.setCollection(coll)
				.setFilter(Utility.stringToUint8Array(Utility.filterToString(query.filter)));

			if (query.options) {
				deleteRequest.setOptions(
					Utility._deleteRequestOptionsToProtoDeleteRequestOptions(query.options)
				);
			}

			this.client.delete(
				deleteRequest,
				Utility.txToMetadata(tx as GrpcSession),
				(error, response) => {
					if (error) {
						reject(error);
					} else {
						const metadata: DMLMetadata = new DMLMetadata(
							response.getMetadata().getCreatedAt(),
							response.getMetadata().getUpdatedAt()
						);
						resolve(new DeleteResponse(metadata));
					}
				}
			);
		});
	}

	findMany(
		db: string,
		branch: string,
		coll: string,
		query: FindQuery<T>,
		tx?: Session
	): GrpcCursor<T> {
		const readRequest = new ProtoReadRequest()
			.setProject(db)
			.setBranch(branch)
			.setCollection(coll)
			.setFilter(Utility.stringToUint8Array(Utility.filterToString(query.filter)));

		if (query.readFields) {
			readRequest.setFields(
				Utility.stringToUint8Array(Utility.readFieldString<T>(query.readFields))
			);
		}

		if (query.sort) {
			readRequest.setSort(Utility.stringToUint8Array(Utility._sortOrderingToString<T>(query.sort)));
		}

		if (query.options) {
			readRequest.setOptions(Utility._readRequestOptionsToProtoReadRequestOptions(query.options));
		}

		const initializer = new ReadCursorInitializer(this.client, readRequest, tx as GrpcSession);
		return new GrpcCursor<T>(initializer, this.config);
	}

	explain(db: string, branch: string, coll: string, query: FindQuery<T>): Promise<ExplainResponse> {
		const readRequest = new ProtoReadRequest()
			.setProject(db)
			.setBranch(branch)
			.setCollection(coll)
			.setFilter(Utility.stringToUint8Array(Utility.filterToString(query.filter)));
		return new Promise((resolve, reject) => {
			this.client.explain(readRequest, (err, resp) => {
				if (err) {
					return reject(err);
				}

				const explainResp = resp.toObject();
				explainResp.readType =
					resp.getReadType() === "secondary index"
						? ("secondary index" as ReadType)
						: ("primary index" as ReadType);

				resolve(explainResp as ExplainResponse);
			});
		});
	}

	count(db: string, branch: string, coll: string, filter?: Filter<T>): Promise<number> {
		if (!filter) {
			filter = {};
		}
		const countRequest = new ProtoCountRequest()
			.setProject(db)
			.setCollection(coll)
			.setBranch(branch)
			.setFilter(Utility.stringToUint8Array(Utility.filterToString(filter)));

		return new Promise((resolve, reject) => {
			this.client.count(countRequest, (err, response) => {
				if (err) {
					return reject(err);
				}
				resolve(response.getCount());
			});
		});
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

	// TODO this should not be here
	private setCreatedAtForDocsIfNotExists(
		docs: Array<T>,
		createdAt: Date,
		collectionCreatedAtFieldNames: string[]
	): Array<T> {
		const clonedDocs: T[] = Object.assign([], docs);
		let docIndex = 0;

		for (const doc of docs) {
			collectionCreatedAtFieldNames.map((fieldName) => {
				if (!Reflect.has(doc, fieldName)) {
					Reflect.set(clonedDocs[docIndex], fieldName, createdAt);
				}
			});
			docIndex++;
		}

		return clonedDocs;
	}
}
