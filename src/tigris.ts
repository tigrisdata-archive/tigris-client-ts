import {TigrisClient} from './proto/server/v1/api_grpc_pb';
import * as grpc from 'grpc';
import {status} from 'grpc';
import {
    CreateDatabaseRequest as ProtoCreateDatabaseRequest,
    DatabaseOptions as ProtoDatabaseOptions,
    DropDatabaseRequest as ProtoDropDatabaseRequest,
    ListDatabasesRequest as ProtoListDatabasesRequest,
    ListCollectionsRequest as ProtoListCollectionsRequest,
    CollectionOptions as ProtoCollectionOptions,
    DropCollectionRequest as ProtoDropCollectionRequest,
    DescribeDatabaseRequest as ProtoDescribeDatabaseRequest,
} from './proto/server/v1/api_pb';
import {
    CollectionDescription,
    CollectionInfo,
    CollectionMetadata,
    CollectionOptions, DatabaseDescription,
    DatabaseInfo,
    DatabaseMetadata,
    DatabaseOptions, DropCollectionResponse,
    DropDatabaseResponse
} from "./types";

export interface TigrisClientConfig {
    serverUrl: string;
}

/**
 * Tigris client
 */
export class Tigris {
    grpcClient: TigrisClient;

    /**
     *
     * @param  {TigrisClientConfig} config configuration
     */
    constructor(config: TigrisClientConfig) {
        this.grpcClient = new TigrisClient(
            config.serverUrl,
            grpc.credentials.createInsecure(),
        );
    }

    /**
     * Lists the databases
     * @return {Promise<Array<DatabaseInfo>>} a promise of an array of
     * DatabaseInfo
     */
    public listDatabases(): Promise<Array<DatabaseInfo>> {
        return new Promise<Array<DatabaseInfo>>((resolve, reject) => {
            this.grpcClient.listDatabases(
                new ProtoListDatabasesRequest(),
                (error, response) => {
                    if (error) {
                        reject(error);
                    } else {
                        let result: DatabaseInfo[] = []
                        for (let i = 0; i < response.getDatabasesList().length; i++) {
                            let protoDatabaseInfo = response.getDatabasesList()[i];
                            result.push(new DatabaseInfo(protoDatabaseInfo.getDb(), new DatabaseMetadata()))
                        }
                        resolve(result);
                    }
                },
            );
        });
    }

    public createDatabaseIfNotExists(db: string, options?: DatabaseOptions): Promise<DB> {
        return new Promise<DB>((resolve, reject) => {
            this.grpcClient.createDatabase(new ProtoCreateDatabaseRequest().setDb(db).setOptions(new ProtoDatabaseOptions()),
                (error, response) => {
                    if (error && error.code != status.ALREADY_EXISTS) {
                        reject(error);
                    } else {
                        resolve(new DB(db, this.grpcClient))
                    }
                })
        });
    }

    public dropDatabase(db: string, options?: DatabaseOptions): Promise<DropDatabaseResponse> {
        return new Promise<DropDatabaseResponse>((resolve, reject) => {
            this.grpcClient.dropDatabase(
                new ProtoDropDatabaseRequest().setDb(db).setOptions(new ProtoDatabaseOptions()),
                (error, response) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(new DropDatabaseResponse(response.getStatus(), response.getMessage()))
                    }
                }
            )
        });
    }

    public getDatabase(db: string): DB {
        return new DB(db, this.grpcClient);
    }
}

/**
 * Tigris Database
 */
export class DB {
    private readonly _db: string
    private readonly grpcClient: TigrisClient;

    constructor(db: string, grpcClient: TigrisClient) {
        this._db = db;
        this.grpcClient = grpcClient;
    }

    public listCollections(options?: CollectionOptions): Promise<Array<CollectionInfo>> {
        return new Promise<Array<CollectionInfo>>((resolve, reject) => {
            let request = new ProtoListCollectionsRequest().setDb(this.db);
            if (typeof options !== 'undefined') {
                return request.setOptions(new ProtoCollectionOptions())
            }
            this.grpcClient.listCollections(request, (error, response) => {
                if (error) {
                    reject(error)
                } else {
                    let result: CollectionInfo[] = []
                    for (let i = 0; i < response.getCollectionsList().length; i++) {
                        result.push(new CollectionInfo(response.getCollectionsList()[i].getCollection(), new CollectionMetadata()));
                    }
                    resolve(result)
                }
            })
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
                        resolve(
                            new DropCollectionResponse(
                                response.getStatus(),
                                response.getMessage()
                            )
                        )
                    }

                }
            )
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
                        let collectionsDescription: CollectionDescription[] = [];
                        for (let i = 0; i < response.getCollectionsList().length; i++) {
                            collectionsDescription.push(new CollectionDescription(
                                response.getCollectionsList()[i].getCollection(),
                                new CollectionMetadata(),
                                response.getCollectionsList()[i].getSchema_asB64()
                            ))
                        }
                        resolve(new DatabaseDescription(response.getDb(), new DatabaseMetadata(), collectionsDescription))
                    }
                }
            )
        });
    }

    public getCollection(collectionName: string): Collection {
        return new Collection(collectionName);
    }

    get db(): string {
        return this._db;
    }
}

/**
 * A marker type for collection model
 */
export interface TigrisCollectionType {
}

/**
 * Tigris Collection
 */
export class Collection {
    private readonly _collectionName: string;

    constructor(collectionName: string) {
        this._collectionName = collectionName;
    }

    get collectionName(): string {
        return this._collectionName;
    }
}

/**
 * Default instance of the Tigrisclient
 */
export default new Tigris({serverUrl: `${process.env.TIGRIS_SERVER_URL}`});
