import { DatabaseDriver } from "../driver";
import { Utility } from "../../utility";
import { TigrisClient } from "../../proto/server/v1/api_grpc_pb";
import { Log } from "../../utils/logger";
import { Metadata, ChannelCredentials, ServiceError, ClientOptions } from "@grpc/grpc-js";
import {
	BeginTransactionRequest as ProtoBeginTransactionRequest,
	BeginTransactionResponse,
	CollectionOptions as ProtoCollectionOptions,
	CreateBranchRequest as ProtoCreateBranchRequest,
	CreateOrUpdateCollectionRequest as ProtoCreateOrUpdateCollectionRequest,
	DeleteBranchRequest as ProtoDeleteBranchRequest,
	DescribeDatabaseRequest as ProtoDescribeDatabaseRequest,
	DropCollectionRequest as ProtoDropCollectionRequest,
	ListCollectionsRequest as ProtoListCollectionsRequest,
	CommitTransactionRequest as ProtoCommitTransactionRequest,
	RollbackTransactionRequest as ProtoRollbackTransactionRequest,
} from "../../proto/server/v1/api_pb";
import { TigrisClientConfig } from "../../tigris";
import { Status } from "@grpc/grpc-js/build/src/constants";
import {
	CollectionDescription,
	CollectionInfo,
	CollectionMetadata,
	CollectionOptions,
	CommitTransactionResponse,
	CreateBranchResponse,
	DatabaseDescription,
	DatabaseMetadata,
	DeleteBranchResponse,
	DropCollectionResponse,
	RollbackTransactionResponse,
	Session,
	TransactionOptions,
} from "../../types";
import { TigrisError } from "../../error";
import { GrpcSession } from "./session";

const SetCookie = "Set-Cookie";
const Cookie = "Cookie";
const BeginTransactionMethodName = "/tigrisdata.v1.Tigris/BeginTransaction";

export class Database implements DatabaseDriver {
	client: TigrisClient;
	config: TigrisClientConfig;

	constructor(
		config: TigrisClientConfig,
		channelCredentials: ChannelCredentials,
		opts: ClientOptions
	) {
		this.config = config;
		this.client = new TigrisClient(config.serverUrl, channelCredentials, opts);
	}

	createOrUpdateCollection(
		project: string,
		branch: string,
		coll: string,
		onlyCreate: false,
		schema: string
	): Promise<void> {
		return new Promise((resolve, reject) => {
			const createOrUpdateCollectionRequest = new ProtoCreateOrUpdateCollectionRequest()
				.setProject(project)
				.setBranch(branch)
				.setCollection(coll)
				.setOnlyCreate(onlyCreate)
				.setSchema(Utility.stringToUint8Array(schema));

			this.client.createOrUpdateCollection(
				createOrUpdateCollectionRequest,
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				(error, _response) => {
					if (error) {
						reject(error);
						return;
					}
					resolve();
				}
			);
		});
	}

	public listCollections(
		projectName: string,
		branch: string,
		options?: CollectionOptions
	): Promise<Array<CollectionInfo>> {
		return new Promise<Array<CollectionInfo>>((resolve, reject) => {
			const request = new ProtoListCollectionsRequest().setProject(projectName).setBranch(branch);
			if (typeof options !== "undefined") {
				return request.setOptions(new ProtoCollectionOptions());
			}
			this.client.listCollections(request, (error, response) => {
				if (error) {
					reject(error);
				} else {
					const result = response
						.getCollectionsList()
						.map(
							(collectionInfo) =>
								new CollectionInfo(collectionInfo.getCollection(), new CollectionMetadata())
						);
					resolve(result);
				}
			});
		});
	}

	dropCollection(
		project: string,
		branch: string,
		collection: string
	): Promise<DropCollectionResponse> {
		return new Promise<DropCollectionResponse>((resolve, reject) => {
			this.client.dropCollection(
				new ProtoDropCollectionRequest()
					.setProject(project)
					.setBranch(branch)
					.setCollection(collection),
				(error, response) => {
					if (error) {
						reject(error);
					} else {
						resolve(new DropCollectionResponse(response.getMessage()));
					}
				}
			);
		});
	}

	describe(name: string, branch: string): Promise<DatabaseDescription> {
		return new Promise<DatabaseDescription>((resolve, reject) => {
			this.client.describeDatabase(
				new ProtoDescribeDatabaseRequest().setProject(name).setBranch(branch),
				(error, response) => {
					if (error) {
						reject(error);
					} else {
						const collectionsDescription: CollectionDescription[] = [];
						for (let i = 0; i < response.getCollectionsList().length; i++) {
							collectionsDescription.push(
								new CollectionDescription(
									response.getCollectionsList()[i].getCollection(),
									new CollectionMetadata(),
									response.getCollectionsList()[i].getSchema_asB64()
								)
							);
						}
						resolve(
							new DatabaseDescription(
								new DatabaseMetadata(),
								collectionsDescription,
								response.getBranchesList()
							)
						);
					}
				}
			);
		});
	}

	public beginTransaction(
		name: string,
		branch: string,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		_options?: TransactionOptions
	): Promise<Session> {
		return new Promise<Session>((resolve, reject) => {
			const beginTxRequest = new ProtoBeginTransactionRequest().setProject(name).setBranch(branch);
			const cookie: Metadata = new Metadata();
			const call = this.client.makeUnaryRequest(
				BeginTransactionMethodName,
				(value) => Buffer.from(value.serializeBinary()),
				(value) => BeginTransactionResponse.deserializeBinary(value),
				beginTxRequest,
				(error: ServiceError, response: BeginTransactionResponse) => {
					if (error) {
						reject(error);
					} else {
						// on metadata is expected to have invoked at this point since response
						// is served
						resolve(
							new GrpcSession(
								response.getTxCtx().getId(),
								response.getTxCtx().getOrigin(),
								this.client,
								name,
								branch,
								cookie
							)
						);
					}
				}
			);
			call.on("metadata", (metadata) => {
				if (metadata.get(SetCookie)) {
					for (const inboundCookie of metadata.get(SetCookie)) cookie.add(Cookie, inboundCookie);
				}
			});
		});
	}

	commit(db: string, branch: string, metadata: Metadata): Promise<CommitTransactionResponse> {
		return new Promise<CommitTransactionResponse>((resolve, reject) => {
			const request = new ProtoCommitTransactionRequest().setProject(db).setBranch(branch);
			this.client.commitTransaction(request, metadata, (error, response) => {
				if (error) {
					reject(error);
				} else {
					resolve(new CommitTransactionResponse(response.getStatus()));
				}
			});
		});
	}

	public rollback(
		db: string,
		branch: string,
		metadata: Metadata
	): Promise<RollbackTransactionResponse> {
		return new Promise<RollbackTransactionResponse>((resolve, reject) => {
			const request = new ProtoRollbackTransactionRequest().setProject(db).setBranch(branch);
			this.client.rollbackTransaction(request, metadata, (error, response) => {
				if (error) {
					reject(error);
				} else {
					resolve(new RollbackTransactionResponse(response.getStatus()));
				}
			});
		});
	}

	public createBranch(name: string, branch: string): Promise<CreateBranchResponse> {
		return new Promise((resolve, reject) => {
			const req = new ProtoCreateBranchRequest().setProject(name).setBranch(branch);
			this.client.createBranch(req, (error, response) => {
				if (error) {
					if ((error as ServiceError).code === Status.ALREADY_EXISTS) {
						return reject(new TigrisError(`'${branch}' branch already exists`));
					}

					if (error.code === Status.NOT_FOUND) {
						const msg = `The project ${name} could not be found. Please ensure ${name} exists in your Tigris deployment or target Tigris region.`;
						Log.error(msg);
					}

					reject(error);
					return;
				}
				resolve(CreateBranchResponse.from(response));
			});
		});
	}

	public deleteBranch(name: string, branch: string): Promise<DeleteBranchResponse> {
		return new Promise((resolve, reject) => {
			const req = new ProtoDeleteBranchRequest().setProject(name).setBranch(branch);
			this.client.deleteBranch(req, (error, response) => {
				if (error) {
					reject(error);
					return;
				}
				resolve(DeleteBranchResponse.from(response));
			});
		});
	}
}
