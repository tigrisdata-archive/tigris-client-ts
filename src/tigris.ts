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
    InsertRequestOptions as ProtoInsertRequestOptions,
    ReadRequest as ProtoReadRequest,
    ReadResponse as ProtoReadResponse,
    ReadRequestOptions as ProtoReadRequestOptions,
    DeleteRequest as ProtoDeleteRequest,
} from './proto/server/v1/api_pb';
import {
    CollectionDescription,
    CollectionInfo,
    CollectionMetadata,
    CollectionOptions, DatabaseDescription,
    DatabaseInfo,
    DatabaseMetadata,
    DatabaseOptions, DeleteRequestOptions, DeleteResponse, DMLMetadata, DropCollectionResponse,
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
                        const metadata: DMLMetadata = new DMLMetadata(
                            response.getMetadata().getCreatedAt(),
                            response.getMetadata().getUpdatedAt()
                        )
                        resolve(new InsertResponse(response.getStatus(), metadata))
                    }
                }
            )
        });
    }

    insert(doc: T, options?: InsertOptions): Promise<InsertResponse> {
        return this.insertMany(options, doc);
    }

    readOne(filter: Filter<string | number | boolean> | LogicalFilter<string | number | boolean>, readFields?: ReadFields): Promise<T | void> {
        return new Promise<T | void>((resolve, reject) => {
            const readRequest = new ProtoReadRequest()
                .setDb(this._db)
                .setCollection(this._collectionName)
                .setOptions(new ProtoReadRequestOptions().setLimit(1))
                .setFilter(Utility.stringToUint8Array(Utility.filterString(filter)))

            if(readFields){
                readRequest.setFields(Utility.stringToUint8Array(Utility.readFieldString(readFields)))
            }
            const stream: grpc.ClientReadableStream<ProtoReadResponse> = this._grpcClient.read(readRequest);
            let doc: T;
            stream.on('data', (readResponse: ProtoReadResponse) => {
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

    read(filter: Filter<string | number | boolean> | LogicalFilter<string | number | boolean>, reader: ReaderCallback<T>, readFields?: ReadFields) {
        const readRequest = new ProtoReadRequest()
            .setDb(this._db)
            .setCollection(this._collectionName)
            .setFilter(Utility.stringToUint8Array(Utility.filterString(filter)))

        if(readFields){
            readRequest.setFields(Utility.stringToUint8Array(Utility.readFieldString(readFields)))
        }
        const stream: grpc.ClientReadableStream<ProtoReadResponse> = this._grpcClient.read(readRequest)
        stream.on('data', (readResponse: ProtoReadResponse) => {
            const doc: T = JSON.parse(Buffer.from(readResponse.getData_asB64(), 'base64').toString('binary'));
            reader.onNext(doc);
        });

        stream.on('error', (error) => reader.onError(error))
        stream.on('end', () => reader.onEnd())
    }

    delete(filter: Filter<string | number | boolean> | LogicalFilter<string | number | boolean>, options?: DeleteRequestOptions): Promise<DeleteResponse> {
        return new Promise<DeleteResponse>((resolve, reject) => {
            const deleteRequest = new ProtoDeleteRequest().setDb(this._db)
                .setCollection(this._collectionName)
                .setFilter(Utility.stringToUint8Array(Utility.filterString(filter)))
            this._grpcClient.delete(deleteRequest, (error, response) => {
                if (error) {
                    reject(error);
                } else {
                    const metadata: DMLMetadata = new DMLMetadata(
                        response.getMetadata().getCreatedAt(),
                        response.getMetadata().getUpdatedAt()
                    )
                    resolve(new DeleteResponse(response.getStatus(), metadata))
                }
            });
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

export type ReadFields = {
    include?: string[];
    exclude?: string[];
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

    filterString<T extends string | number | boolean>(filter: Filter<T> | LogicalFilter<T>): string {
        // eslint-disable-next-line no-prototype-builtins
        return filter.hasOwnProperty('logicalOperator') ? Utility._logicalFilterString(filter as LogicalFilter<any>) : JSON.stringify(this.filterJSON(filter as Filter<any>));
    },

    filterJSON(filter: Filter<string | number | boolean>): object {
        const obj = {};
        obj[filter.key] = filter.val;
        return obj;
    },

    _logicalFilterString<T extends string | number | boolean>(filter: LogicalFilter<T>): string {
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
    },
    readFieldString(readFields: ReadFields): string {
        const obj = {};
        if(readFields.include){
            for (const field of readFields.include) {
                obj[field] = true;
            }
        }
        if(readFields.exclude){
            for (const field of readFields.exclude) {
                obj[field] = false;
            }
        }
        return JSON.stringify(obj);
    }
};

export enum LogicalOperator {
    AND = '$and',
    OR = '$or'
}

export interface ReaderCallback<T> {
    onNext(doc: T);

    onEnd();

    onError(error: Error);
}