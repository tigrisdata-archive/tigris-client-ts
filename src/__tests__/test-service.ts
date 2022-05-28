import { ITigrisServer, TigrisService } from "../proto/server/v1/api_grpc_pb";
import { sendUnaryData, ServerUnaryCall, ServerWritableStream } from "@grpc/grpc-js";
import { v4 as uuidv4 } from "uuid";
import {
	BeginTransactionRequest,
	BeginTransactionResponse,
	CollectionInfo,
	CommitTransactionRequest,
	CommitTransactionResponse,
	CreateDatabaseRequest,
	CreateDatabaseResponse,
	CreateOrUpdateCollectionRequest,
	CreateOrUpdateCollectionResponse,
	DatabaseInfo,
	DatabaseMetadata,
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
	RollbackTransactionRequest,
	RollbackTransactionResponse,
	StreamRequest,
	StreamResponse,
	UpdateRequest,
	UpdateResponse,
	CollectionMetadata,
	CollectionDescription,
	ResponseMetadata,
	GetInfoRequest,
	GetInfoResponse,
	TransactionCtx,
} from "../proto/server/v1/api_pb";
import * as google_protobuf_timestamp_pb from "google-protobuf/google/protobuf/timestamp_pb";
import { Utility } from "./../utility";

export class TestTigrisService {
	private static DBS: string[] = [];
	private static COLLECTION_MAP = new Map<string, Array<string>>();
	private static txId: string;
	private static txOrigin: string;

	static reset() {
		TestTigrisService.DBS = [];
		TestTigrisService.COLLECTION_MAP = new Map<string, Array<string>>();
		this.txId = "";
		this.txOrigin = "";
		for (let d = 1; d <= 5; d++) {
			TestTigrisService.DBS.push("db" + d);
			const collections: string[] = [];
			for (let c = 1; c <= 5; c++) {
				collections[c - 1] = "db" + d + "_coll_" + c;
			}
			TestTigrisService.COLLECTION_MAP.set("db" + d, collections);
		}
	}

	public impl: ITigrisServer = {
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		beginTransaction(
			call: ServerUnaryCall<BeginTransactionRequest, BeginTransactionResponse>,
			callback: sendUnaryData<BeginTransactionResponse>
		): void {
			const reply: BeginTransactionResponse = new BeginTransactionResponse();
			if (call.request.getDb() === "test-tx") {
				TestTigrisService.txId = uuidv4();
				TestTigrisService.txOrigin = uuidv4();
				reply.setTxCtx(
					new TransactionCtx().setId(TestTigrisService.txId).setOrigin(TestTigrisService.txOrigin)
				);
				callback(undefined, reply);
				return;
			}
			reply.setTxCtx(new TransactionCtx().setId("id-test").setOrigin("origin-test"));
			callback(undefined, reply);
		},
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		commitTransaction(
			call: ServerUnaryCall<CommitTransactionRequest, CommitTransactionResponse>,
			callback: sendUnaryData<CommitTransactionResponse>
		): void {
			const reply: CommitTransactionResponse = new CommitTransactionResponse();
			reply.setStatus("committed-test");
			callback(undefined, reply);
		},
		createDatabase(
			call: ServerUnaryCall<CreateDatabaseRequest, CreateDatabaseResponse>,
			callback: sendUnaryData<CreateDatabaseResponse>
		): void {
			TestTigrisService.DBS.push(call.request.getDb());
			const reply: CreateDatabaseResponse = new CreateDatabaseResponse();
			reply.setMessage(call.request.getDb() + " created successfully");
			reply.setStatus("created");
			callback(undefined, reply);
		},
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		createOrUpdateCollection(
			call: ServerUnaryCall<CreateOrUpdateCollectionRequest, CreateOrUpdateCollectionResponse>,
			callback: sendUnaryData<CreateOrUpdateCollectionResponse>
		): void {},
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		delete(
			call: ServerUnaryCall<DeleteRequest, DeleteResponse>,
			callback: sendUnaryData<DeleteResponse>
		): void {
			if (call.request.getDb() === "test-tx") {
				const txIdHeader = call.metadata.get("tx-id").toString();
				const txOriginHeader = call.metadata.get("tx-origin").toString();
				if (txIdHeader != TestTigrisService.txId || txOriginHeader != TestTigrisService.txOrigin) {
					callback(new Error("transaction mismatch - delete"));
					return;
				}
			}
			const reply: DeleteResponse = new DeleteResponse();
			reply.setStatus("deleted: " + Utility.uint8ArrayToString(call.request.getFilter_asU8()));
			reply.setMetadata(
				new ResponseMetadata()
					.setCreatedAt(new google_protobuf_timestamp_pb.Timestamp())
					.setUpdatedAt(new google_protobuf_timestamp_pb.Timestamp())
			);
			callback(undefined, reply);
		},
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		describeCollection(
			call: ServerUnaryCall<DescribeCollectionRequest, DescribeCollectionResponse>,
			callback: sendUnaryData<DescribeCollectionResponse>
		): void {},

		describeDatabase(
			call: ServerUnaryCall<DescribeDatabaseRequest, DescribeDatabaseResponse>,
			callback: sendUnaryData<DescribeDatabaseResponse>
		): void {
			const result: DescribeDatabaseResponse = new DescribeDatabaseResponse();
			const collectionsDescription: CollectionDescription[] = [];
			for (
				let index = 0;
				index < TestTigrisService.COLLECTION_MAP.get(call.request.getDb()).length;
				index++
			) {
				collectionsDescription.push(
					new CollectionDescription()
						.setCollection(TestTigrisService.COLLECTION_MAP.get(call.request.getDb())[index])
						.setMetadata(new CollectionMetadata())
						.setSchema("schema" + index)
				);
			}
			result
				.setDb(call.request.getDb())
				.setMetadata(new DatabaseMetadata())
				.setCollectionsList(collectionsDescription);
			callback(undefined, result);
		},

		dropCollection(
			call: ServerUnaryCall<DropCollectionRequest, DropCollectionResponse>,
			callback: sendUnaryData<DropCollectionResponse>
		): void {
			const newCollections = TestTigrisService.COLLECTION_MAP.get(call.request.getDb()).filter(
				(coll) => coll !== call.request.getCollection()
			);
			TestTigrisService.COLLECTION_MAP.set(call.request.getDb(), newCollections);
			const reply: DropCollectionResponse = new DropCollectionResponse();
			reply.setMessage(call.request.getCollection() + " dropped successfully");
			reply.setStatus("dropped");
			callback(undefined, reply);
		},
		dropDatabase(
			call: ServerUnaryCall<DropDatabaseRequest, DropDatabaseResponse>,
			callback: sendUnaryData<DropDatabaseResponse>
		): void {
			TestTigrisService.DBS = TestTigrisService.DBS.filter(
				(database) => database !== call.request.getDb()
			);
			const reply: DropDatabaseResponse = new DropDatabaseResponse();
			reply.setMessage(call.request.getDb() + " dropped successfully");
			reply.setStatus("dropped");
			callback(undefined, reply);
		},
		insert(
			call: ServerUnaryCall<InsertRequest, InsertResponse>,
			callback: sendUnaryData<InsertResponse>
		): void {
			if (call.request.getDb() === "test-tx") {
				const txIdHeader = call.metadata.get("tx-id").toString();
				const txOriginHeader = call.metadata.get("tx-origin").toString();
				if (txIdHeader != TestTigrisService.txId || txOriginHeader != TestTigrisService.txOrigin) {
					callback(new Error("transaction mismatch - insert"));
					return;
				}
			}
			const reply: InsertResponse = new InsertResponse();
			reply.setStatus(
				"inserted: " +
					JSON.stringify(new TextDecoder().decode(call.request.getDocumentsList_asU8()[0]))
			);
			reply.setMetadata(
				new ResponseMetadata()
					.setCreatedAt(new google_protobuf_timestamp_pb.Timestamp())
					.setUpdatedAt(new google_protobuf_timestamp_pb.Timestamp())
			);
			callback(undefined, reply);
		},
		listCollections(
			call: ServerUnaryCall<ListCollectionsRequest, ListCollectionsResponse>,
			callback: sendUnaryData<ListCollectionsResponse>
		): void {
			const reply: ListCollectionsResponse = new ListCollectionsResponse();
			const collectionInfos: CollectionInfo[] = [];
			for (
				let index = 0;
				index < TestTigrisService.COLLECTION_MAP.get(call.request.getDb()).length;
				index++
			) {
				collectionInfos.push(
					new CollectionInfo()
						.setCollection(TestTigrisService.COLLECTION_MAP.get(call.request.getDb())[index])
						.setMetadata(new CollectionMetadata())
				);
			}
			reply.setCollectionsList(collectionInfos);
			callback(undefined, reply);
		},
		listDatabases(
			call: ServerUnaryCall<ListDatabasesRequest, ListDatabasesResponse>,
			callback: sendUnaryData<ListDatabasesResponse>
		): void {
			const reply: ListDatabasesResponse = new ListDatabasesResponse();
			const databaseInfos: DatabaseInfo[] = [];
			for (let index = 0; index < TestTigrisService.DBS.length; index++) {
				databaseInfos.push(
					new DatabaseInfo().setDb(TestTigrisService.DBS[index]).setMetadata(new DatabaseMetadata())
				);
			}

			reply.setDatabasesList(databaseInfos);
			callback(undefined, reply);
		},
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		read(call: ServerWritableStream<ReadRequest, ReadResponse>): void {
			if (call.request.getDb() === "test-tx") {
				const txIdHeader = call.metadata.get("tx-id").toString();
				const txOriginHeader = call.metadata.get("tx-origin").toString();
				if (txIdHeader != TestTigrisService.txId || txOriginHeader != TestTigrisService.txOrigin) {
					// figure out error
					// Server code.
					call.emit("error", {
						message: "transaction mismatch - read",
					});
					call.end();
					return;
				}
			}
			// read one implementation
			const filterString = Utility.uint8ArrayToString(call.request.getFilter_asU8());
			const filter = JSON.parse(filterString);
			// for test purpose if id=1, we find the record, else we don't
			if (
				call.request.getOptions() != undefined &&
				call.request.getOptions().getLimit() == 1 &&
				filter["id"] == 1
			) {
				// base64 of {"id":1,"title":"A Passage to India","author":"E.M. Forster","tags":["Novel","India"]}
				call.write(
					new ReadResponse().setData(
						"eyJpZCI6MSwidGl0bGUiOiJBIFBhc3NhZ2UgdG8gSW5kaWEiLCJhdXRob3IiOiJFLk0uIEZvcnN0ZXIiLCJ0YWdzIjpbIk5vdmVsIiwiSW5kaWEiXX0="
					)
				);
				call.end();
			} else if (
				call.request.getOptions() != undefined &&
				call.request.getOptions().getLimit() == 1 &&
				filter["id"] == 2
			) {
				// case where readOne doesn't find the document
				call.end();
			} else if (
				call.request.getOptions() != undefined &&
				call.request.getOptions().getLimit() == 1 &&
				filter["$and"] != undefined
			) {
				// case with logicalFilter passed in
				// base64 of {"id":3,"title":"In Search of Lost Time","author":"Marcel Proust","tags":["Novel","Childhood"]}
				call.write(
					new ReadResponse().setData(
						"eyJpZCI6MywidGl0bGUiOiJJbiBTZWFyY2ggb2YgTG9zdCBUaW1lIiwiYXV0aG9yIjoiTWFyY2VsIFByb3VzdCIsInRhZ3MiOlsiTm92ZWwiLCJDaGlsZGhvb2QiXX0="
					)
				);
				call.end();
			} else {
				// base64 of {"id":3,"title":"In Search of Lost Time","author":"Marcel Proust","tags":["Novel","Childhood"]}
				call.write(
					new ReadResponse().setData(
						"eyJpZCI6MywidGl0bGUiOiJJbiBTZWFyY2ggb2YgTG9zdCBUaW1lIiwiYXV0aG9yIjoiTWFyY2VsIFByb3VzdCIsInRhZ3MiOlsiTm92ZWwiLCJDaGlsZGhvb2QiXX0="
					)
				);
				// base64 of {"id":4,"title":"Swann's Way","author":"Marcel Proust"}
				call.write(
					new ReadResponse().setData(
						"eyJpZCI6NCwidGl0bGUiOiJTd2FubidzIFdheSIsImF1dGhvciI6Ik1hcmNlbCBQcm91c3QifQ=="
					)
				);
				// base64 of {"id":5,"title":"Time Regained","author":"Marcel Proust"}
				call.write(
					new ReadResponse().setData(
						"eyJpZCI6NSwidGl0bGUiOiJUaW1lIFJlZ2FpbmVkIiwiYXV0aG9yIjoiTWFyY2VsIFByb3VzdCJ9"
					)
				);
				// base64 of {"id":6,"title":"The Prisoner","author":"Marcel Proust"}
				call.write(
					new ReadResponse().setData(
						"eyJpZCI6NiwidGl0bGUiOiJUaGUgUHJpc29uZXIiLCJhdXRob3IiOiJNYXJjZWwgUHJvdXN0In0="
					)
				);
				call.end();
			}
		},
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		replace(
			call: ServerUnaryCall<ReplaceRequest, ReplaceResponse>,
			callback: sendUnaryData<ReplaceResponse>
		): void {},
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		rollbackTransaction(
			call: ServerUnaryCall<RollbackTransactionRequest, RollbackTransactionResponse>,
			callback: sendUnaryData<RollbackTransactionResponse>
		): void {
			const reply: RollbackTransactionResponse = new RollbackTransactionResponse();
			reply.setStatus("rollback-test");
			callback(undefined, reply);
		},
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		stream(call: ServerWritableStream<StreamRequest, StreamResponse>): void {},
		update(
			call: ServerUnaryCall<UpdateRequest, UpdateResponse>,
			callback: sendUnaryData<UpdateResponse>
		): void {
			if (call.request.getDb() === "test-tx") {
				const txIdHeader = call.metadata.get("tx-id").toString();
				const txOriginHeader = call.metadata.get("tx-origin").toString();
				if (txIdHeader != TestTigrisService.txId || txOriginHeader != TestTigrisService.txOrigin) {
					callback(new Error("transaction mismatch - update"));
					return;
				}
			}
			const reply: UpdateResponse = new UpdateResponse();
			reply.setStatus(
				"updated: " +
					Utility.uint8ArrayToString(call.request.getFilter_asU8()) +
					", " +
					Utility.uint8ArrayToString(call.request.getFields_asU8())
			);
			reply.setMetadata(
				new ResponseMetadata()
					.setCreatedAt(new google_protobuf_timestamp_pb.Timestamp())
					.setUpdatedAt(new google_protobuf_timestamp_pb.Timestamp())
			);
			callback(undefined, reply);
		},
		getInfo(
			call: ServerUnaryCall<GetInfoRequest, GetInfoResponse>,
			callback: sendUnaryData<GetInfoResponse>
		): void {},
	};
}

export default {
	service: TigrisService,
	handler: new TestTigrisService(),
};
