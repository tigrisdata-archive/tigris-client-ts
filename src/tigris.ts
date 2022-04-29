import {TigrisClient} from './proto/server/v1/api_grpc_pb';
import * as grpc from 'grpc';
import {status} from 'grpc';
import {
    CreateDatabaseRequest as ProtoCreateDatabaseRequest,
    DatabaseOptions as ProtoDatabaseOptions,
    DropDatabaseRequest as ProtoDropDatabaseRequest,
    ListDatabasesRequest as ProtoListDatabasesRequest
} from './proto/server/v1/api_pb';
import {DatabaseInfo, DatabaseMetadata, DatabaseOptions, DropDatabaseResponse} from "./types";

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

    public createDatabaseIfNotExists(db: string, options: DatabaseOptions): Promise<DB> {
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

    public dropDatabase(db: string, options: DatabaseOptions): Promise<DropDatabaseResponse> {
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
}

/**
 * Default instance of the Tigrisclient
 */
export default new Tigris({serverUrl: `${process.env.TIGRIS_SERVER_URL}`});
