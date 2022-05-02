import {ITigrisServer, TigrisService} from '../proto/server/v1/api_grpc_pb';
import grpc, {sendUnaryData, ServerUnaryCall, ServerWritableStream} from 'grpc';
import {
    BeginTransactionRequest, BeginTransactionResponse, CollectionInfo,
    CommitTransactionRequest,
    CommitTransactionResponse,
    CreateDatabaseRequest,
    CreateDatabaseResponse,
    CreateOrUpdateCollectionRequest,
    CreateOrUpdateCollectionResponse,
    DatabaseInfo, DatabaseMetadata,
    DeleteRequest,
    DeleteResponse,
    DescribeCollectionRequest,
    DescribeCollectionResponse,
    DescribeDatabaseRequest,
    DescribeDatabaseResponse,
    DropCollectionRequest,
    DropCollectionResponse,
    DropDatabaseRequest,
    DropDatabaseResponse,
    InsertRequest,
    InsertResponse,
    ListCollectionsRequest,
    ListCollectionsResponse,
    ListDatabasesRequest,
    ListDatabasesResponse,
    ReadRequest,
    ReadResponse,
    ReplaceRequest,
    ReplaceResponse,
    RollbackTransactionRequest, RollbackTransactionResponse,
    StreamRequest, StreamResponse, UpdateRequest, UpdateResponse,
    CollectionMetadata, CollectionDescription
} from '../proto/server/v1/api_pb';

export class TestTigrisService implements ITigrisServer {

    private dbs: string[] = [];
    private collectionMap = new Map<string, Array<string>>();

    constructor() {
        for (let d = 1; d <= 5; d++) {
            this.dbs.push('db' + d);
            let collections: string[] = [];
            for (let c = 1; c <= 5; c++) {
                collections[c - 1] = 'db' + d + '_coll_' + c;
            }
            this.collectionMap.set('db' + d, collections);
        }
    }

    listDatabases = (
        call: grpc.ServerUnaryCall<ListDatabasesRequest>,
        callback: grpc.sendUnaryData<ListDatabasesResponse>): void => {
        const reply: ListDatabasesResponse = new ListDatabasesResponse();
        const dbInfos: DatabaseInfo[] = [];
        for (let i = 0; i < this.dbs.length; i++) {
            dbInfos.push(new DatabaseInfo().setDb(this.dbs[i]).setMetadata(new DatabaseMetadata()));
        }

        reply.setDatabasesList(dbInfos);
        callback(null, reply);
    };

    beginTransaction(call: ServerUnaryCall<BeginTransactionRequest>, callback: sendUnaryData<BeginTransactionResponse>): void {
    }

    commitTransaction(call: ServerUnaryCall<CommitTransactionRequest>, callback: sendUnaryData<CommitTransactionResponse>): void {
    }

    createDatabase(call: ServerUnaryCall<CreateDatabaseRequest>, callback: sendUnaryData<CreateDatabaseResponse>): void {
        this.dbs.push(call.request.getDb())
        const reply: CreateDatabaseResponse = new CreateDatabaseResponse();
        reply.setMessage(call.request.getDb() + ' created successfully')
        reply.setStatus('created')
        callback(null, reply)
    }

    createOrUpdateCollection(call: ServerUnaryCall<CreateOrUpdateCollectionRequest>, callback: sendUnaryData<CreateOrUpdateCollectionResponse>): void {
    }

    delete(call: ServerUnaryCall<DeleteRequest>, callback: sendUnaryData<DeleteResponse>): void {
    }

    describeCollection(call: ServerUnaryCall<DescribeCollectionRequest>, callback: sendUnaryData<DescribeCollectionResponse>): void {
    }

    describeDatabase(call: ServerUnaryCall<DescribeDatabaseRequest>, callback: sendUnaryData<DescribeDatabaseResponse>): void {
        const result: DescribeDatabaseResponse = new DescribeDatabaseResponse();
        const collectionsDescription: CollectionDescription[] = [];
        for (let i = 0; i < this.collectionMap.get(call.request.getDb()).length; i++) {
            collectionsDescription.push(
                new CollectionDescription()
                    .setCollection(this.collectionMap.get(call.request.getDb())[i])
                    .setMetadata(new CollectionMetadata()).setSchema('schema' + i)
            );
        }
        result.setDb(call.request.getDb()).setMetadata(new DatabaseMetadata()).setCollectionsList(collectionsDescription);
        callback(null, result)
    }

    dropCollection(call: ServerUnaryCall<DropCollectionRequest>, callback: sendUnaryData<DropCollectionResponse>): void {
        let newCollections = this.collectionMap.get(call.request.getDb()).filter(coll => coll !== call.request.getCollection());
        this.collectionMap.set(call.request.getDb(), newCollections)
        const reply: DropCollectionResponse = new DropCollectionResponse();
        reply.setMessage(call.request.getCollection() + ' dropped successfully')
        reply.setStatus('dropped')
        callback(null, reply)
    }

    dropDatabase(call: ServerUnaryCall<DropDatabaseRequest>, callback: sendUnaryData<DropDatabaseResponse>): void {
        this.dbs = this.dbs.filter(db => db !== call.request.getDb());
        const reply: DropDatabaseResponse = new DropDatabaseResponse();
        reply.setMessage(call.request.getDb() + ' dropped successfully')
        reply.setStatus('dropped')
        callback(null, reply)
    }

    insert(call: ServerUnaryCall<InsertRequest>, callback: sendUnaryData<InsertResponse>): void {
    }

    listCollections(call: ServerUnaryCall<ListCollectionsRequest>, callback: sendUnaryData<ListCollectionsResponse>): void {
        const reply: ListCollectionsResponse = new ListCollectionsResponse();
        const collectionInfos: CollectionInfo[] = [];
        for (let i = 0; i < this.collectionMap.get(call.request.getDb()).length; i++) {
            collectionInfos.push(new CollectionInfo().setCollection(this.collectionMap.get(call.request.getDb())[i]).setMetadata(new CollectionMetadata()));
        }
        reply.setCollectionsList(collectionInfos)
        callback(null, reply)
    }

    read(call: ServerWritableStream<ReadRequest, ReadResponse>): void {
    }

    replace(call: ServerUnaryCall<ReplaceRequest>, callback: sendUnaryData<ReplaceResponse>): void {
    }

    rollbackTransaction(call: ServerUnaryCall<RollbackTransactionRequest>, callback: sendUnaryData<RollbackTransactionResponse>): void {
    }

    stream(call: ServerWritableStream<StreamRequest, StreamResponse>): void {
    }

    update(call: ServerUnaryCall<UpdateRequest>, callback: sendUnaryData<UpdateResponse>): void {
    }
}

export default {
    service: TigrisService,
    handler: new TestTigrisService(),
};
