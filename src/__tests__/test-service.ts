import { TigrisService } from "../proto/server/v1/api_grpc_pb";
import * as grpc from "@grpc/grpc-js";
import { sendUnaryData, ServerUnaryCall, ServerWritableStream } from "@grpc/grpc-js";
import { v4 as uuidv4 } from "uuid";
import {
	BeginTransactionRequest,
	BeginTransactionResponse,
	CollectionDescription,
	CollectionIndex,
	CollectionInfo,
	CollectionMetadata,
	CommitTransactionRequest,
	CommitTransactionResponse,
	CountRequest,
	CountResponse,
	CreateBranchRequest,
	CreateBranchResponse,
	CreateOrUpdateCollectionRequest,
	CreateOrUpdateCollectionResponse,
	CreateProjectRequest,
	CreateProjectResponse,
	DatabaseMetadata,
	DeleteBranchRequest,
	DeleteBranchResponse,
	DeleteProjectRequest,
	DeleteProjectResponse,
	DeleteRequest,
	DeleteResponse,
	DescribeCollectionRequest,
	DescribeCollectionResponse,
	DescribeDatabaseRequest,
	DescribeDatabaseResponse,
	DropCollectionRequest,
	DropCollectionResponse,
	ExplainResponse,
	FacetCount,
	GroupedSearchHits,
	InsertRequest,
	InsertResponse,
	ListCollectionsRequest,
	ListCollectionsResponse,
	ListProjectsRequest,
	ListProjectsResponse,
	Page,
	ProjectInfo,
	ReadRequest,
	ReadResponse,
	ReplaceRequest,
	ReplaceResponse,
	ResponseMetadata,
	RollbackTransactionRequest,
	RollbackTransactionResponse,
	SearchFacet,
	SearchHit,
	SearchHitMeta,
	SearchMetadata,
	SearchRequest,
	SearchResponse,
	TransactionCtx,
	UpdateRequest,
	UpdateResponse,
} from "../proto/server/v1/api_pb";
import * as google_protobuf_timestamp_pb from "google-protobuf/google/protobuf/timestamp_pb";
import { Utility } from "../utility";
import { Status } from "@grpc/grpc-js/build/src/constants";
import assert from "assert";
import { Tigris } from "../tigris";
import { Collection } from "../collection";

export class TestTigrisService {
	public static readonly ExpectedBranch = "unit-tests";
	private static PROJECTS: string[] = [];
	private static COLLECTION_MAP = new Map<string, Array<string>>();
	private static txId: string;
	private static txOrigin: string;
	public static readonly BOOKS_B64_BY_ID: ReadonlyMap<string, string> = new Map([
		// base64 of {"id":1,"title":"A Passage to India","author":"E.M. Forster","tags":["Novel","India"]}
		[
			"1",
			"eyJpZCI6MSwidGl0bGUiOiJBIFBhc3NhZ2UgdG8gSW5kaWEiLCJhdXRob3IiOiJFLk0uIEZvcnN0ZXIiLCJ0YWdzIjpbIk5vdmVsIiwiSW5kaWEiXX0=",
		],
		// base64 of {"id":3,"title":"In Search of Lost Time","author":"Marcel Proust","tags":["Novel","Childhood"]}
		[
			"3",
			"eyJpZCI6MywidGl0bGUiOiJJbiBTZWFyY2ggb2YgTG9zdCBUaW1lIiwiYXV0aG9yIjoiTWFyY2VsIFByb3VzdCIsInRhZ3MiOlsiTm92ZWwiLCJDaGlsZGhvb2QiXX0=",
		],
		// base64 of {"id":4,"title":"Swann's Way","author":"Marcel Proust"}
		["4", "eyJpZCI6NCwidGl0bGUiOiJTd2FubidzIFdheSIsImF1dGhvciI6Ik1hcmNlbCBQcm91c3QifQ=="],
		// base64 of {"id":5,"title":"Time Regained","author":"Marcel Proust"}
		["5", "eyJpZCI6NSwidGl0bGUiOiJUaW1lIFJlZ2FpbmVkIiwiYXV0aG9yIjoiTWFyY2VsIFByb3VzdCJ9"],
		// base64 of {"id":6,"title":"The Prisoner","author":"Marcel Proust"}
		["6", "eyJpZCI6NiwidGl0bGUiOiJUaGUgUHJpc29uZXIiLCJhdXRob3IiOiJNYXJjZWwgUHJvdXN0In0="],
		// base64 of {"id":7,"title":"A Passage to India","author":"E.M. Forster","tags":["Novel","India"], "purchasedOn": "2023-04-14T09:39:19.288Z"}
		[
			"7",
			"eyJpZCI6NywidGl0bGUiOiJBIFBhc3NhZ2UgdG8gSW5kaWEiLCJhdXRob3IiOiJFLk0uIEZvcnN0ZXIiLCJ0YWdzIjpbIk5vdmVsIiwiSW5kaWEiXSwgInB1cmNoYXNlZE9uIjogIjIwMjMtMDQtMTRUMDk6Mzk6MTkuMjg4WiJ9",
		],
	]);

	private myDatabase: any;

	public static readonly ALERTS_B64_BY_ID: ReadonlyMap<number, string> = new Map([
		// base64 of {"id":1,"text":"test"}
		[1, "eyJpZCI6MSwidGV4dCI6InRlc3QifQ=="],
		// base64 of {"id":2,"text":"test message 25"}
		[2, "eyJpZCI6MiwidGV4dCI6InRlc3QgbWVzc2FnZSAyNSJ9"],
	]);

	static reset() {
		TestTigrisService.PROJECTS = [];
		TestTigrisService.COLLECTION_MAP = new Map<string, Array<string>>();
		this.txId = "";
		this.txOrigin = "";
		for (let d = 1; d <= 5; d++) {
			TestTigrisService.PROJECTS.push("db" + d);
			const collections: string[] = [];
			for (let c = 1; c <= 5; c++) {
				collections[c - 1] = "db" + d + "_coll_" + c;
			}
			TestTigrisService.COLLECTION_MAP.set("db" + d, collections);
		}
	}

	public impl: {
		deleteBranch(
			call: ServerUnaryCall<DeleteBranchRequest, DeleteBranchResponse>,
			callback: sendUnaryData<DeleteBranchResponse>
		): void;
		read(call: ServerWritableStream<ReadRequest, ReadResponse>): void;
		describeDatabase(
			call: ServerUnaryCall<DescribeDatabaseRequest, DescribeDatabaseResponse>,
			callback: sendUnaryData<DescribeDatabaseResponse>
		): void;
		replace(
			call: ServerUnaryCall<ReplaceRequest, ReplaceResponse>,
			callback: sendUnaryData<ReplaceResponse>
		): void;
		rollbackTransaction(
			call: ServerUnaryCall<RollbackTransactionRequest, RollbackTransactionResponse>,
			callback: sendUnaryData<RollbackTransactionResponse>
		): void;
		insert(
			call: ServerUnaryCall<InsertRequest, InsertResponse>,
			callback: sendUnaryData<InsertResponse>
		): void;
		update(
			call: ServerUnaryCall<UpdateRequest, UpdateResponse>,
			callback: sendUnaryData<UpdateResponse>
		): void;
		createProject(
			call: ServerUnaryCall<CreateProjectRequest, CreateProjectResponse>,
			callback: sendUnaryData<CreateProjectResponse>
		): void;
		listProjects(
			call: ServerUnaryCall<ListProjectsRequest, ListProjectsResponse>,
			callback: sendUnaryData<ListProjectsResponse>
		): void;
		delete(
			call: ServerUnaryCall<DeleteRequest, DeleteResponse>,
			callback: sendUnaryData<DeleteResponse>
		): void;
		describeCollection(
			_call: ServerUnaryCall<DescribeCollectionRequest, DescribeCollectionResponse>,
			_callback: sendUnaryData<DescribeCollectionResponse>
		): void;
		search(call: ServerWritableStream<SearchRequest, SearchResponse>): void;
		createOrUpdateCollection(
			call: ServerUnaryCall<CreateOrUpdateCollectionRequest, CreateOrUpdateCollectionResponse>,
			callback: sendUnaryData<CreateOrUpdateCollectionResponse>
		): void;
		beginTransaction(
			call: ServerUnaryCall<BeginTransactionRequest, BeginTransactionResponse>,
			callback: sendUnaryData<BeginTransactionResponse>
		): void;
		commitTransaction(
			call: ServerUnaryCall<CommitTransactionRequest, CommitTransactionResponse>,
			callback: sendUnaryData<CommitTransactionResponse>
		): void;
		dropCollection(
			call: ServerUnaryCall<DropCollectionRequest, DropCollectionResponse>,
			callback: sendUnaryData<DropCollectionResponse>
		): void;
		deleteProject(
			call: ServerUnaryCall<DeleteProjectRequest, DeleteProjectResponse>,
			callback: sendUnaryData<DeleteProjectResponse>
		): void;
		createBranch(
			call: ServerUnaryCall<CreateBranchRequest, CreateBranchResponse>,
			callback: sendUnaryData<CreateBranchResponse>
		): void;
		listCollections(
			call: ServerUnaryCall<ListCollectionsRequest, ListCollectionsResponse>,
			callback: sendUnaryData<ListCollectionsResponse>
		): void;
		explain(
			call: ServerUnaryCall<ReadRequest, ExplainResponse>,
			callback: sendUnaryData<ExplainResponse>
		): void;
	} = {
		createBranch(
			call: ServerUnaryCall<CreateBranchRequest, CreateBranchResponse>,
			callback: sendUnaryData<CreateBranchResponse>
		): void {
			let err: Partial<grpc.StatusObject>;
			const reply = new CreateBranchResponse();

			switch (call.request.getBranch()) {
				case Branch.Existing:
					err = {
						code: Status.ALREADY_EXISTS,
						details: `branch already exists '${Branch.Existing}'`,
					};
					break;
				case Branch.NotFound:
					err = {
						code: Status.NOT_FOUND,
						details: `project not found`,
					};
					break;
				default:
					reply.setStatus("created");
					reply.setMessage("branch successfully created");
			}

			if (err) {
				return callback(err, undefined);
			} else {
				return callback(undefined, reply);
			}
		},
		deleteBranch(
			call: ServerUnaryCall<DeleteBranchRequest, DeleteBranchResponse>,
			callback: sendUnaryData<DeleteBranchResponse>
		): void {
			let err: Partial<grpc.StatusObject>;
			const reply = new DeleteBranchResponse();
			switch (call.request.getBranch()) {
				case Branch.NotFound:
					err = {
						code: Status.NOT_FOUND,
						details: `Branch doesn't exist`,
					};
					break;
				default:
					reply.setStatus("deleted");
					reply.setMessage("branch deleted successfully");
			}
			if (err) {
				return callback(err, undefined);
			} else {
				return callback(undefined, reply);
			}
		},
		beginTransaction(
			call: ServerUnaryCall<BeginTransactionRequest, BeginTransactionResponse>,
			callback: sendUnaryData<BeginTransactionResponse>
		): void {
			assert(call.request.getBranch() === TestTigrisService.ExpectedBranch);

			const reply: BeginTransactionResponse = new BeginTransactionResponse();
			if (call.request.getProject() === "test-tx") {
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
		commitTransaction(
			call: ServerUnaryCall<CommitTransactionRequest, CommitTransactionResponse>,
			callback: sendUnaryData<CommitTransactionResponse>
		): void {
			assert(call.request.getBranch() === TestTigrisService.ExpectedBranch);

			const reply: CommitTransactionResponse = new CommitTransactionResponse();
			callback(undefined, reply);
		},
		createProject(
			call: ServerUnaryCall<CreateProjectRequest, CreateProjectResponse>,
			callback: sendUnaryData<CreateProjectResponse>
		): void {
			TestTigrisService.PROJECTS.push(call.request.getProject());
			const reply: CreateProjectResponse = new CreateProjectResponse();
			reply.setMessage(call.request.getProject() + " created successfully");
			reply.setStatus("created");
			callback(undefined, reply);
		},
		createOrUpdateCollection(
			call: ServerUnaryCall<CreateOrUpdateCollectionRequest, CreateOrUpdateCollectionResponse>,
			callback: sendUnaryData<CreateOrUpdateCollectionResponse>
		): void {
			assert(call.request.getBranch() === TestTigrisService.ExpectedBranch);

			const reply: CreateOrUpdateCollectionResponse = new CreateOrUpdateCollectionResponse();
			reply.setStatus("Collections created successfully");
			reply.setStatus(call.request.getCollection());
			callback(undefined, reply);
		},
		delete(
			call: ServerUnaryCall<DeleteRequest, DeleteResponse>,
			callback: sendUnaryData<DeleteResponse>
		): void {
			assert(call.request.getBranch() === TestTigrisService.ExpectedBranch);

			if (call.request.getProject() === "test-tx") {
				const txIdHeader = call.metadata.get("Tigris-Tx-Id").toString();
				const txOriginHeader = call.metadata.get("Tigris-Tx-Origin").toString();
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

		/* eslint-disable @typescript-eslint/no-empty-function */
		describeCollection(
			call: ServerUnaryCall<DescribeCollectionRequest, DescribeCollectionResponse>,
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			callback: sendUnaryData<DescribeCollectionResponse>
		): void {
			assert(call.request.getBranch() === TestTigrisService.ExpectedBranch);

			const indexList: CollectionIndex[] = [
				new CollectionIndex().setName("title").setState("INDEX ACTIVE").setFieldsList([]),
				new CollectionIndex().setName("author").setState("INDEX WRITE MODE").setFieldsList([]),
			];

			const reply = new DescribeCollectionResponse()
				.setSchema("schema")
				.setCollection(call.request.getCollection())
				.setIndexesList(indexList);

			callback(undefined, reply);
		},

		describeDatabase(
			call: ServerUnaryCall<DescribeDatabaseRequest, DescribeDatabaseResponse>,
			callback: sendUnaryData<DescribeDatabaseResponse>
		): void {
			const result: DescribeDatabaseResponse = new DescribeDatabaseResponse();
			const collectionsDescription: CollectionDescription[] = [];
			for (
				let index = 0;
				index < TestTigrisService.COLLECTION_MAP.get(call.request.getProject()).length;
				index++
			) {
				collectionsDescription.push(
					new CollectionDescription()
						.setCollection(TestTigrisService.COLLECTION_MAP.get(call.request.getProject())[index])
						.setMetadata(new CollectionMetadata())
						.setSchema("schema" + index)
				);
			}
			result
				.setMetadata(new DatabaseMetadata())
				.setCollectionsList(collectionsDescription)
				.setBranchesList(["main", "staging", TestTigrisService.ExpectedBranch]);
			callback(undefined, result);
		},

		dropCollection(
			call: ServerUnaryCall<DropCollectionRequest, DropCollectionResponse>,
			callback: sendUnaryData<DropCollectionResponse>
		): void {
			assert(call.request.getBranch() === TestTigrisService.ExpectedBranch);

			const newCollections = TestTigrisService.COLLECTION_MAP.get(call.request.getProject()).filter(
				(coll) => coll !== call.request.getCollection()
			);
			TestTigrisService.COLLECTION_MAP.set(call.request.getProject(), newCollections);
			const reply: DropCollectionResponse = new DropCollectionResponse();
			reply.setMessage(call.request.getCollection() + " dropped successfully");
			reply.setStatus("dropped");
			callback(undefined, reply);
		},
		deleteProject(
			call: ServerUnaryCall<DeleteProjectRequest, DeleteProjectResponse>,
			callback: sendUnaryData<DeleteProjectResponse>
		): void {
			TestTigrisService.PROJECTS = TestTigrisService.PROJECTS.filter(
				(database) => database !== call.request.getProject()
			);
			const reply: DeleteProjectResponse = new DeleteProjectResponse();
			reply.setMessage(call.request.getProject() + " dropped successfully");
			reply.setStatus("dropped");
			callback(undefined, reply);
		},
		insert(
			call: ServerUnaryCall<InsertRequest, InsertResponse>,
			callback: sendUnaryData<InsertResponse>
		): void {
			assert(call.request.getBranch() === TestTigrisService.ExpectedBranch);

			if (call.request.getProject() === "test-tx") {
				const txIdHeader = call.metadata.get("Tigris-Tx-Id").toString();
				const txOriginHeader = call.metadata.get("Tigris-Tx-Origin").toString();
				if (txIdHeader != TestTigrisService.txId || txOriginHeader != TestTigrisService.txOrigin) {
					callback(new Error("transaction mismatch - insert"));
					return;
				}
			}

			const reply: InsertResponse = new InsertResponse();
			const keyList: Array<string> = [];
			for (let i = 1; i <= call.request.getDocumentsList().length; i++) {
				if (call.request.getCollection() === "books-with-optional-field") {
					const extractedKeyFromAuthor: number = JSON.parse(
						Utility._base64Decode(call.request.getDocumentsList_asB64()[i - 1])
					)["author"];
					keyList.push(Utility._base64Encode('{"id":' + extractedKeyFromAuthor + "}"));
				} else if (call.request.getCollection() === "books-multi-pk") {
					keyList.push(Utility._base64Encode('{"id":' + i + ', "id2":' + i + 1 + "}"));
				} else {
					keyList.push(Utility._base64Encode('{"id":' + i + "}"));
				}
			}
			reply.setKeysList(keyList);
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
			assert(call.request.getBranch() === TestTigrisService.ExpectedBranch);

			const reply: ListCollectionsResponse = new ListCollectionsResponse();
			const collectionInfos: CollectionInfo[] = [];
			for (
				let index = 0;
				index < TestTigrisService.COLLECTION_MAP.get(call.request.getProject()).length;
				index++
			) {
				collectionInfos.push(
					new CollectionInfo()
						.setCollection(TestTigrisService.COLLECTION_MAP.get(call.request.getProject())[index])
						.setMetadata(new CollectionMetadata())
				);
			}
			reply.setCollectionsList(collectionInfos);
			callback(undefined, reply);
		},
		listProjects(
			call: ServerUnaryCall<ListProjectsRequest, ListProjectsResponse>,
			callback: sendUnaryData<ListProjectsResponse>
		): void {
			const reply: ListProjectsResponse = new ListProjectsResponse();
			const databaseInfos: ProjectInfo[] = [];
			for (let index = 0; index < TestTigrisService.PROJECTS.length; index++) {
				databaseInfos.push(
					new ProjectInfo()
						.setProject(TestTigrisService.PROJECTS[index])
						.setMetadata(new DatabaseMetadata())
				);
			}

			reply.setProjectsList(databaseInfos);
			callback(undefined, reply);
		},
		read(call: ServerWritableStream<ReadRequest, ReadResponse>): void {
			assert(call.request.getBranch() === TestTigrisService.ExpectedBranch);

			if (call.request.getProject() === "test-tx") {
				const txIdHeader = call.metadata.get("Tigris-Tx-Id").toString();
				const txOriginHeader = call.metadata.get("Tigris-Tx-Origin").toString();
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

			if (call.request.getCollection() === "test_topic") {
				for (const [id] of TestTigrisService.ALERTS_B64_BY_ID) {
					call.write(new ReadResponse().setData(TestTigrisService.ALERTS_B64_BY_ID.get(id)));
				}
				call.end();
				return;
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
				// base64 of book id "1"
				call.write(new ReadResponse().setData(TestTigrisService.BOOKS_B64_BY_ID.get("1")));
				call.end();
			}
			// for date type test purpose if id = 7, we find the record, else we don't
			else if (
				call.request.getOptions() != undefined &&
				call.request.getOptions().getLimit() == 1 &&
				filter["id"] == 7
			) {
				// base64 of book id "7"
				call.write(new ReadResponse().setData(TestTigrisService.BOOKS_B64_BY_ID.get("7")));
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
				// base64 of book id "3"
				call.write(new ReadResponse().setData(TestTigrisService.BOOKS_B64_BY_ID.get("3")));
				call.end();
			} else if (filter["id"] === -1) {
				// throw an error
				call.emit("error", { message: "unknown record requested" });
				call.end();
			} else {
				// returns 4 books
				for (const id of ["3", "4", "5", "6"]) {
					call.write(new ReadResponse().setData(TestTigrisService.BOOKS_B64_BY_ID.get(id)));
				}
				call.end();
			}
		},
		search(call: ServerWritableStream<SearchRequest, SearchResponse>): void {
			assert(call.request.getBranch() === TestTigrisService.ExpectedBranch);

			const searchMeta = new SearchMetadata().setFound(5).setTotalPages(5);
			const isGroupByQuery = Utility.uint8ArrayToString(call.request.getGroupBy_asU8()).length;
			if (isGroupByQuery) {
				const searchHitArray1: SearchHit[] = [];
				const searchHitArray2: SearchHit[] = [];

				const setSearchHitFn = (searchHitArray, id) => {
					const searchHitMeta = new SearchHitMeta().setUpdatedAt(
						new google_protobuf_timestamp_pb.Timestamp()
					);
					const searchHit = new SearchHit().setMetadata(searchHitMeta);
					searchHit.setData(TestTigrisService.BOOKS_B64_BY_ID.get(id));
					searchHitArray.push(searchHit);
				};

				for (const id of ["1", "7"]) {
					setSearchHitFn(searchHitArray1, id);
				}
				for (const id of ["3", "4", "5", "6"]) {
					setSearchHitFn(searchHitArray2, id);
				}

				const groupedSearchHits1 = new GroupedSearchHits()
					.setGroupKeysList(["E.M. Forster"])
					.setHitsList(searchHitArray1);
				const groupedSearchHits2 = new GroupedSearchHits()
					.setGroupKeysList(["Marcel Proust"])
					.setHitsList(searchHitArray2);

				const resp = new SearchResponse().setGroupList([groupedSearchHits1, groupedSearchHits2]);
				call.write(resp);
				call.end();
			}
			// paginated search impl
			else if (call.request.getPage() > 0) {
				const searchPage = new Page()
					.setSize(call.request.getPageSize())
					.setCurrent(call.request.getPage());
				const resp = new SearchResponse().setMeta(searchMeta.setPage(searchPage));
				call.write(resp);
				call.end();
			} else {
				// empty search response to stream
				call.write(new SearchResponse());

				// with only meta and not page
				call.write(new SearchResponse().setMeta(searchMeta));

				// with meta and page
				const searchPage = new Page().setSize(1).setCurrent(1);
				call.write(new SearchResponse().setMeta(searchMeta.setPage(searchPage)));

				// with facets, meta and page
				const searchFacet = new SearchFacet().setCountsList([
					new FacetCount().setCount(2).setValue("Marcel Proust"),
				]);
				const resp = new SearchResponse().setMeta(searchMeta.setPage(searchPage));
				resp.getFacetsMap().set("author", searchFacet);
				call.write(resp);

				// with first hit, meta and page
				const searchHitMeta = new SearchHitMeta().setUpdatedAt(
					new google_protobuf_timestamp_pb.Timestamp()
				);
				const searchHit = new SearchHit().setMetadata(searchHitMeta);

				// write all search hits to stream 1 by 1
				// eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/ban-ts-comment
				// @ts-ignore
				for (const booksb64BYIDElement of TestTigrisService.BOOKS_B64_BY_ID) {
					searchHit.setData(booksb64BYIDElement[1]);
					call.write(resp.setHitsList([searchHit]));
				}
				call.end();
			}
		},
		replace(
			call: ServerUnaryCall<ReplaceRequest, ReplaceResponse>,
			callback: sendUnaryData<ReplaceResponse>
		): void {
			assert(call.request.getBranch() === TestTigrisService.ExpectedBranch);

			if (call.request.getProject() === "test-tx") {
				const txIdHeader = call.metadata.get("Tigris-Tx-Id").toString();
				const txOriginHeader = call.metadata.get("Tigris-Tx-Origin").toString();
				if (txIdHeader != TestTigrisService.txId || txOriginHeader != TestTigrisService.txOrigin) {
					callback(new Error("transaction mismatch - insertOrReplace"));
					return;
				}
			}
			const reply: ReplaceResponse = new ReplaceResponse();
			const keyList: Array<string> = [];
			for (let i = 1; i <= call.request.getDocumentsList().length; i++) {
				if (call.request.getCollection() === "books-with-optional-field") {
					const extractedKeyFromAuthor: number = JSON.parse(
						Utility._base64Decode(call.request.getDocumentsList_asB64()[i - 1])
					)["author"];
					keyList.push(Utility._base64Encode('{"id":' + extractedKeyFromAuthor + "}"));
				} else {
					keyList.push(Utility._base64Encode('{"id":' + i + "}"));
				}
			}
			reply.setKeysList(keyList);
			reply.setStatus(
				"insertedOrReplaced: " +
					JSON.stringify(new TextDecoder().decode(call.request.getDocumentsList_asU8()[0]))
			);
			reply.setMetadata(
				new ResponseMetadata()
					.setCreatedAt(new google_protobuf_timestamp_pb.Timestamp())
					.setUpdatedAt(new google_protobuf_timestamp_pb.Timestamp())
			);
			callback(undefined, reply);
		},
		rollbackTransaction(
			call: ServerUnaryCall<RollbackTransactionRequest, RollbackTransactionResponse>,
			callback: sendUnaryData<RollbackTransactionResponse>
		): void {
			assert(call.request.getBranch() === TestTigrisService.ExpectedBranch);

			const reply: RollbackTransactionResponse = new RollbackTransactionResponse();
			callback(undefined, reply);
		},
		update(
			call: ServerUnaryCall<UpdateRequest, UpdateResponse>,
			callback: sendUnaryData<UpdateResponse>
		): void {
			assert(call.request.getBranch() === TestTigrisService.ExpectedBranch);

			if (call.request.getProject() === "test-tx") {
				const txIdHeader = call.metadata.get("Tigris-Tx-Id").toString();
				const txOriginHeader = call.metadata.get("Tigris-Tx-Origin").toString();
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
			reply.setModifiedCount(1);
			reply.setMetadata(
				new ResponseMetadata()
					.setCreatedAt(new google_protobuf_timestamp_pb.Timestamp())
					.setUpdatedAt(new google_protobuf_timestamp_pb.Timestamp())
			);
			callback(undefined, reply);
		},
		explain(
			call: ServerUnaryCall<ReadRequest, ExplainResponse>,
			callback: sendUnaryData<ExplainResponse>
		): void {
			assert(call.request.getBranch() === TestTigrisService.ExpectedBranch);

			if (call.request.getProject() === "test-tx") {
				const txIdHeader = call.metadata.get("Tigris-Tx-Id").toString();
				const txOriginHeader = call.metadata.get("Tigris-Tx-Origin").toString();
				if (txIdHeader != TestTigrisService.txId || txOriginHeader != TestTigrisService.txOrigin) {
					callback(new Error("transaction mismatch - explain"));
					return;
				}
			}
			const reply: ExplainResponse = new ExplainResponse();
			reply.setFilter(JSON.stringify({ author: "Marcel Proust" }));
			reply.setReadType("secondary index");
			callback(undefined, reply);
		},
	};

	count(
		call: ServerUnaryCall<CountRequest, CountResponse>,
		callback: sendUnaryData<CountResponse>
	): void {
		const collectionName = call.request.getCollection();
		const filter = Utility.uint8ArrayToString(call.request.getFilter_asU8());

		const collection = this.myDatabase.collection(collectionName);

		collection
			.countDocuments(filter)
			.then((count) => {
				const response = new CountResponse().setCount(count);
				callback(null, response);
			})
			.catch((error) => {
				callback(error, null);
			});
	}
}

export default {
	service: TigrisService,
	handler: new TestTigrisService(),
};

export enum Branch {
	Existing = "existing",
	NotFound = "no-project",
}
