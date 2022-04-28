import {ITigrisServer, TigrisService} from '../proto/server/v1/api_grpc_pb';
import grpc, {sendUnaryData, ServerUnaryCall, ServerWritableStream} from 'grpc';
import {
  BeginTransactionRequest, BeginTransactionResponse,
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
} from '../proto/server/v1/api_pb';
class TestTigrisService implements ITigrisServer {
  listDatabases = (
      call: grpc.ServerUnaryCall<ListDatabasesRequest>,
      callback: grpc.sendUnaryData<ListDatabasesResponse>): void => {
    const reply: ListDatabasesResponse = new ListDatabasesResponse();
    const dbs : DatabaseInfo[] = [];
    dbs.push(new DatabaseInfo().setDb('db1').setMetadata(new DatabaseMetadata()));
    dbs.push(new DatabaseInfo().setDb('db2').setMetadata(new DatabaseMetadata()));
    dbs.push(new DatabaseInfo().setDb('db3').setMetadata(new DatabaseMetadata()));
    dbs.push(new DatabaseInfo().setDb('db4').setMetadata(new DatabaseMetadata()));
    dbs.push(new DatabaseInfo().setDb('db5').setMetadata(new DatabaseMetadata()));
    reply.setDatabasesList(dbs);
    callback(null, reply);
  };

  beginTransaction(call: ServerUnaryCall<BeginTransactionRequest>, callback: sendUnaryData<BeginTransactionResponse>): void {
  }

  commitTransaction(call: ServerUnaryCall<CommitTransactionRequest>, callback: sendUnaryData<CommitTransactionResponse>): void {
  }

  createDatabase(call: ServerUnaryCall<CreateDatabaseRequest>, callback: sendUnaryData<CreateDatabaseResponse>): void {
  }

  createOrUpdateCollection(call: ServerUnaryCall<CreateOrUpdateCollectionRequest>, callback: sendUnaryData<CreateOrUpdateCollectionResponse>): void {
  }

  delete(call: ServerUnaryCall<DeleteRequest>, callback: sendUnaryData<DeleteResponse>): void {
  }

  describeCollection(call: ServerUnaryCall<DescribeCollectionRequest>, callback: sendUnaryData<DescribeCollectionResponse>): void {
  }

  describeDatabase(call: ServerUnaryCall<DescribeDatabaseRequest>, callback: sendUnaryData<DescribeDatabaseResponse>): void {
  }

  dropCollection(call: ServerUnaryCall<DropCollectionRequest>, callback: sendUnaryData<DropCollectionResponse>): void {
  }

  dropDatabase(call: ServerUnaryCall<DropDatabaseRequest>, callback: sendUnaryData<DropDatabaseResponse>): void {
  }

  insert(call: ServerUnaryCall<InsertRequest>, callback: sendUnaryData<InsertResponse>): void {
  }

  listCollections(call: ServerUnaryCall<ListCollectionsRequest>, callback: sendUnaryData<ListCollectionsResponse>): void {
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
