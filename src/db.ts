import {TigrisClient} from "./proto/server/v1/api_grpc_pb";
import {
	CollectionDescription,
	CollectionInfo,
	CollectionMetadata,
	CollectionOptions,
	CollectionType,
	CommitTransactionResponse,
	DatabaseDescription,
	DatabaseMetadata,
	DropCollectionResponse,
	TigrisCollectionType,
	TigrisSchema,
	TransactionOptions,
	TransactionResponse,
} from "./types";
import {
	BeginTransactionRequest as ProtoBeginTransactionRequest,
	BeginTransactionResponse,
	CollectionOptions as ProtoCollectionOptions,
	CreateOrUpdateCollectionRequest as ProtoCreateOrUpdateCollectionRequest,
	DescribeDatabaseRequest as ProtoDescribeDatabaseRequest,
	DropCollectionRequest as ProtoDropCollectionRequest,
	ListCollectionsRequest as ProtoListCollectionsRequest
} from "./proto/server/v1/api_pb";
import {Collection} from "./collection";
import {Session} from "./session";
import {Utility} from "./utility";
import {Metadata, ServiceError} from "@grpc/grpc-js";
import {Topic} from "./topic";

/**
 * Tigris Database
 */
const SetCookie = "Set-Cookie";
const Cookie = "Cookie";
const BeginTransactionMethodName = "/tigrisdata.v1.Tigris/BeginTransaction";

export class DB {
	private readonly _db: string;
	private readonly grpcClient: TigrisClient;

	constructor(db: string, grpcClient: TigrisClient) {
		this._db = db;
		this.grpcClient = grpcClient;
	}

	public createOrUpdateCollection<T extends TigrisCollectionType>(
		collectionName: string, schema: TigrisSchema<T>): Promise<Collection<T>> {
		return this.createOrUpdate(collectionName, CollectionType.DOCUMENTS, schema,
			() => new Collection(collectionName, this._db, this.grpcClient));
	}

	public createOrUpdateTopic<T extends TigrisCollectionType>(
		topicName: string, schema: TigrisSchema<T>): Promise<Topic<T>> {
		return this.createOrUpdate(topicName, CollectionType.MESSAGES, schema,
			() => new Topic(topicName, this._db, this.grpcClient));
	}

	private createOrUpdate<T extends TigrisCollectionType, R>(
		name: string, type: CollectionType, schema: TigrisSchema<T>, resolver: () => R): Promise<R> {
		return new Promise<R>((resolve, reject) => {
			const rawJSONSchema: string = Utility._toJSONSchema(name, type, schema);
			console.log(rawJSONSchema);
			const createOrUpdateCollectionRequest = new ProtoCreateOrUpdateCollectionRequest()
				.setDb(this._db)
				.setCollection(name)
				.setOnlyCreate(false)
				.setSchema(Utility.stringToUint8Array(rawJSONSchema));

			this.grpcClient.createOrUpdateCollection(
				createOrUpdateCollectionRequest,
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				(error, _response) => {
					if (error) {
						reject(error);
						return;
					}
					resolve(resolver());
				});
		});
	}

	public listCollections(options?: CollectionOptions): Promise<Array<CollectionInfo>> {
		return new Promise<Array<CollectionInfo>>((resolve, reject) => {
			const request = new ProtoListCollectionsRequest().setDb(this.db);
			if (typeof options !== "undefined") {
				return request.setOptions(new ProtoCollectionOptions());
			}
			this.grpcClient.listCollections(request, (error, response) => {
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

	public dropCollection(collectionName: string): Promise<DropCollectionResponse> {
		return new Promise<DropCollectionResponse>((resolve, reject) => {
			this.grpcClient.dropCollection(
				new ProtoDropCollectionRequest().setDb(this.db).setCollection(collectionName),
				(error, response) => {
					if (error) {
						reject(error);
					} else {
						resolve(new DropCollectionResponse(response.getStatus(), response.getMessage()));
					}
				}
			);
		});
	}

	public describe(): Promise<DatabaseDescription> {
		return new Promise<DatabaseDescription>((resolve, reject) => {
			this.grpcClient.describeDatabase(
				new ProtoDescribeDatabaseRequest().setDb(this.db),
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
								response.getDb(),
								new DatabaseMetadata(),
								collectionsDescription
							)
						);
					}
				}
			);
		});
	}

	public getCollection<T>(collectionName: string): Collection<T> {
		return new Collection<T>(collectionName, this.db, this.grpcClient);
	}

	public getTopic<T>(topicName: string): Topic<T> {
		return new Topic<T>(topicName, this.db, this.grpcClient);
	}

	public transact(fn: (tx: Session) => void): Promise<TransactionResponse> {
		return new Promise<TransactionResponse>((resolve, reject) => {
			this.beginTransaction()
				.then(async (session) => {
					// tx started
					try {
						// invoke user code
						await fn(session);
						// user code successful
						const commitResponse: CommitTransactionResponse = await session.commit();
						if (commitResponse) {
							resolve(new TransactionResponse("transaction successful"));
						}
					} catch (error) {
						// failed to run user code
						await session.rollback();
						// pass error to user
						reject(error);
					}
				}).catch(error => reject(error));
		});
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	public beginTransaction(_options?: TransactionOptions): Promise<Session> {
		return new Promise<Session>((resolve, reject) => {
			const beginTxRequest = new ProtoBeginTransactionRequest().setDb(this._db);
			const cookie: Metadata = new Metadata();
			const call = this.grpcClient.makeUnaryRequest(BeginTransactionMethodName,
				value => Buffer.from(value.serializeBinary()),
				value => BeginTransactionResponse.deserializeBinary(value),
				beginTxRequest,
				(error: ServiceError, response: BeginTransactionResponse) => {
					if(error) {
						reject(error);
					}else{
						// on metadata is expected to have invoked at this point since response
						// is served
						resolve(new Session(
							response.getTxCtx().getId(),
							response.getTxCtx().getOrigin(),
							this.grpcClient,
							this.db,
							cookie
						));
					}
				});
			call.on("metadata", metadata => {
				if (metadata.get(SetCookie)) {
					for (const inboundCookie of metadata.get(SetCookie)) cookie.add(Cookie, inboundCookie);
				}
			});
		});
	}

	get db(): string {
		return this._db;
	}
}
