import { TigrisClient } from "./proto/server/v1/api_grpc_pb";
import {
	CollectionDescription,
	CollectionInfo,
	CollectionMetadata,
	CollectionOptions,
	DatabaseDescription,
	DatabaseMetadata,
	DropCollectionResponse,
	TransactionOptions,
} from "./types";
import {
	BeginTransactionRequest as ProtoBeginTransactionRequest,
	ListCollectionsRequest as ProtoListCollectionsRequest,
	CollectionOptions as ProtoCollectionOptions,
	DropCollectionRequest as ProtoDropCollectionRequest,
	DescribeDatabaseRequest as ProtoDescribeDatabaseRequest,
} from "./proto/server/v1/api_pb";
import { Collection } from "./collection";
import { Session } from "./session";

/**
 * Tigris Database
 */
export class DB {
	private readonly _db: string;
	private readonly grpcClient: TigrisClient;

	constructor(db: string, grpcClient: TigrisClient) {
		this._db = db;
		this.grpcClient = grpcClient;
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

	public transact(fn: (tx: Session) => void) {
		let sessionVar: Session;
		this.beginTransaction()
			.then((session) => {
				// tx started
				sessionVar = session;
				try {
					// invoke user code
					fn(session);
					// user code successful
					return session.commit();
				} catch (error) {
					// failed to run user code
					// if session was already started, roll it back and throw error
					sessionVar.rollback().finally(() => {
						throw error;
					});
					// if session was not yet started, throw error
					throw error;
				}
			})
			.catch((error) => {
				// failed to begin transaction
				if (sessionVar) {
					sessionVar.rollback().finally(() => {
						throw error;
					});
				} else {
					throw error;
				}
			});
	}

	public beginTransaction(options?: TransactionOptions): Promise<Session> {
		return new Promise<Session>((resolve, reject) => {
			const beginTxRequest = new ProtoBeginTransactionRequest().setDb(this._db);

			this.grpcClient.beginTransaction(beginTxRequest, (error, response) => {
				if (error) {
					reject(error);
				} else {
					resolve(
						new Session(
							response.getTxCtx().getId(),
							response.getTxCtx().getOrigin(),
							this.grpcClient,
							this.db
						)
					);
				}
			});
		});
	}

	get db(): string {
		return this._db;
	}
}
