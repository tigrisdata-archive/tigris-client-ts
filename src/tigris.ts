import {TigrisClient} from './proto/server/v1/api_grpc_pb';
import * as grpc from '@grpc/grpc-js';
import {status} from '@grpc/grpc-js';
import {
    CreateDatabaseRequest as ProtoCreateDatabaseRequest,
    DatabaseOptions as ProtoDatabaseOptions,
    DropDatabaseRequest as ProtoDropDatabaseRequest,
    ListDatabasesRequest as ProtoListDatabasesRequest,
    ListCollectionsRequest as ProtoListCollectionsRequest,
    CollectionOptions as ProtoCollectionOptions,
    DropCollectionRequest as ProtoDropCollectionRequest,
    DescribeDatabaseRequest as ProtoDescribeDatabaseRequest,
    InsertRequest as ProtoInsertRequest,
    InsertRequestOptions as ProtoInsertRequestOptions, ReadRequest, ReadResponse, ReadRequestOptions
} from './proto/server/v1/api_pb';
import {
    CollectionDescription,
    CollectionInfo,
    CollectionMetadata,
    CollectionOptions, DatabaseDescription,
    DatabaseInfo,
    DatabaseMetadata,
    DatabaseOptions, DropCollectionResponse,
    DropDatabaseResponse, InsertOptions, InsertResponse, TigrisCollectionType
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
                        const result = response.getDatabasesList().map(protoDatabaseInfo => new DatabaseInfo(protoDatabaseInfo.getDb(), new DatabaseMetadata()));
                        resolve(result);
                    }
                },
            );
        });
    }

    public createDatabaseIfNotExists(db: string, options?: DatabaseOptions): Promise<DB> {
        return new Promise<DB>((resolve, reject) => {
            this.grpcClient.createDatabase(new ProtoCreateDatabaseRequest().setDb(db).setOptions(new ProtoDatabaseOptions()),
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
            const request = new ProtoListCollectionsRequest().setDb(this.db);
            if (typeof options !== 'undefined') {
                return request.setOptions(new ProtoCollectionOptions())
            }
            this.grpcClient.listCollections(request, (error, response) => {
                if (error) {
                    reject(error)
                } else {
                    const result = response.getCollectionsList().map(collectionInfo => new CollectionInfo(collectionInfo.getCollection(), new CollectionMetadata()));
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
                        const collectionsDescription: CollectionDescription[] = [];
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

    public getCollection<T>(collectionName: string): Collection<T> {
        return new Collection<T>(collectionName, this.db, this.grpcClient)
    }

    get db(): string {
        return this._db;
    }
}


/**
 * Tigris Collection
 */
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

    insertMany(options?: InsertOptions, ...docs: Array<T>): Promise<InsertResponse> {
        return new Promise<InsertResponse>((resolve, reject) => {
            const docsArray = new Array<Uint8Array | string>();
            for (const doc of docs) {
                docsArray.push(new TextEncoder().encode(JSON.stringify(doc)));
            }

            const protoRequest = new ProtoInsertRequest()
                .setDb(this._db)
                .setCollection(this._collectionName)
                .setDocumentsList(docsArray);
            if (options) {
                protoRequest.setOptions(new ProtoInsertRequestOptions().setWriteOptions())
            }
            this._grpcClient.insert(
                protoRequest,
                (error, response) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(new InsertResponse(response.getStatus()))
                    }
                }
            )
        });
    }

    insert(doc: T, options?: InsertOptions): Promise<InsertResponse> {
        return this.insertMany(options, doc);
    }

    readOne(filter: Filter<string | number | boolean> | LogicalFilter<string | number | boolean>):  Promise<T|void> {
        // eslint-disable-next-line no-prototype-builtins
        const filterString: string = filter.hasOwnProperty('logicalOperator') ? Utility.logicalFilterString(filter as LogicalFilter<any>) : Utility.filterString(filter as Filter<any>);
        return new Promise<T|void>((resolve, reject) => {
            const readRequest = new ReadRequest()
                .setDb(this._db)
                .setCollection(this._collectionName)
                .setOptions(new ReadRequestOptions().setLimit(1))
                .setFilter( Utility.stringToUint8Array(filterString))
            const stream: grpc.ClientReadableStream<ReadResponse> = this._grpcClient.read(readRequest);
            let doc: T;
            stream.on('data', (readResponse: ReadResponse) => {
                doc = JSON.parse(Buffer.from(readResponse.getData_asB64(), 'base64').toString('binary'));
                resolve(doc);
            });
            stream.on('error', reject);

            stream.on('end', val => {
                // eslint unicorn/no-useless-undefined: ["error", {"checkArguments": false}]
                resolve()
            })
        });
    }
}

/**
 * Default instance of the Tigrisclient
 */
export default new Tigris({serverUrl: `${process.env.TIGRIS_SERVER_URL}`});

export type Filter<T extends string | number | boolean> = {
    key: string;
    val: T;
}

export type LogicalFilter<T extends string | number | boolean> = {
    logicalOperator: LogicalOperator
    filters?: Filter<T>[];
    logicalFilters?: LogicalFilter<T>[];
}

export const Utility = {

    stringToUint8Array(input: string): Uint8Array {
        return new TextEncoder().encode(input);
    },
    uint8ArrayToString(input: Uint8Array): string {
        return new TextDecoder().decode(input);
    },
    encodeBase64(input: string): string {
        return Buffer.from(input).toString('base64');
    },

    decodeBase64(b64String: string): string {
        return Buffer.from(b64String).toString('binary')
    },

    filterString<T extends string | number | boolean>(filter: Filter<T>): string {
        return JSON.stringify(this.filterJSON(filter));
    },

    filterJSON(filter: Filter<string | number | boolean>): object {
        const obj = {};
        obj[filter.key] = filter.val;
        return obj;
    },

    logicalFilterString<T extends string | number | boolean>(filter: LogicalFilter<T>): string {
        return JSON.stringify(this.logicalFilterJSON(filter));
    },

    logicalFilterJSON(filter: LogicalFilter<string | number | boolean>): object {
        const obj = {};
        const innerArray = [];
        obj[filter.logicalOperator] = innerArray;
        if (filter.filters) {
            for (const value of filter.filters) {
                innerArray.push(this.filterJSON(value));
            }
        }
        if (filter.logicalFilters) {
            for (const value of filter.logicalFilters) {
                innerArray.push(this.logicalFilterJSON(value));
            }
        }
        return obj
    }
};

export enum LogicalOperator {
    AND = '$and',
    OR = '$or'
}