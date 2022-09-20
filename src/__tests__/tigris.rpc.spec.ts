import {Server, ServerCredentials} from "@grpc/grpc-js";
import {TigrisService} from "../proto/server/v1/api_grpc_pb";
import TestService, {TestTigrisService} from "./test-service";
import {
	DatabaseOptions,
	LogicalOperator,
	ReadRequestOptions,
	SelectorFilterOperator,
	StreamEvent,
	TigrisCollectionType,
	TigrisDataTypes,
	TigrisSchema,
	TigrisTopicType,
	UpdateFieldsOperator
} from "../types";
import {Tigris} from "../tigris";
import {Case, SearchRequest, SearchRequestOptions, SearchResult, SortOrder} from "../search/types";
import {Utility} from "../utility";
import {ObservabilityService} from "../proto/server/v1/observability_grpc_pb";
import TestObservabilityService from "./test-observability-service";

describe("rpc tests", () => {
	let server: Server;
	const SERVER_PORT = 5002;
	beforeAll(() => {
		server = new Server();
		TestTigrisService.reset();
		server.addService(TigrisService, TestService.handler.impl);
		server.addService(ObservabilityService, TestObservabilityService.handler.impl)
		server.bindAsync(
			"0.0.0.0:" + SERVER_PORT,
			// test purpose only
			ServerCredentials.createInsecure(),
			(err: Error | null) => {
				if (err) {
					console.log(err);
				} else {
					server.start();
				}
			}
		);
	});
	beforeEach(() => {
		TestTigrisService.reset();
	});
	afterAll(() => {
		server.forceShutdown();
	});

	it("listDatabase", () => {
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT, insecureChannel: true});
		const listDbsPromise = tigris.listDatabases();
		listDbsPromise
			.then((value) => {
					expect(value.length).toBe(5);
					expect(value[0].name).toBe("db1");
					expect(value[1].name).toBe("db2");
					expect(value[2].name).toBe("db3");
					expect(value[3].name).toBe("db4");
					expect(value[4].name).toBe("db5");
				},
			);

		return listDbsPromise;
	});

	it("createDatabaseIfNotExists", () => {
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT, insecureChannel: true});
		const dbCreationPromise = tigris.createDatabaseIfNotExists("db6", new DatabaseOptions());
		dbCreationPromise
			.then((value) => {
					expect(value.db).toBe("db6");
				},
			);

		return dbCreationPromise;
	});

	it("dropDatabase", () => {
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT, insecureChannel: true});
		const dbDropPromise = tigris.dropDatabase("db6", new DatabaseOptions());
		dbDropPromise
			.then((value) => {
					expect(value.status).toBe("dropped");
					expect(value.message).toBe("db6 dropped successfully");
				},
			);
		return dbDropPromise;
	});

	it("getDatabase", () => {
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT, insecureChannel: true});
		const db1 = tigris.getDatabase("db1");
		expect(db1.db).toBe("db1");
	});

	it("listCollections1", () => {
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT, insecureChannel: true});
		const db1 = tigris.getDatabase("db1");

		const listCollectionPromise = db1.listCollections();
		listCollectionPromise.then(value => {
			expect(value.length).toBe(5);
			expect(value[0].name).toBe("db1_coll_1");
			expect(value[1].name).toBe("db1_coll_2");
			expect(value[2].name).toBe("db1_coll_3");
			expect(value[3].name).toBe("db1_coll_4");
			expect(value[4].name).toBe("db1_coll_5");
		});
		return listCollectionPromise;
	});

	it("listCollections2", () => {
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT, insecureChannel: true});
		const db1 = tigris.getDatabase("db3");

		const listCollectionPromise = db1.listCollections();
		listCollectionPromise.then(value => {
			expect(value.length).toBe(5);
			expect(value[0].name).toBe("db3_coll_1");
			expect(value[1].name).toBe("db3_coll_2");
			expect(value[2].name).toBe("db3_coll_3");
			expect(value[3].name).toBe("db3_coll_4");
			expect(value[4].name).toBe("db3_coll_5");
		});
		return listCollectionPromise;
	});

	it("describeDatabase", () => {
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT, insecureChannel: true});
		const db1 = tigris.getDatabase("db3");

		const databaseDescriptionPromise = db1.describe();
		databaseDescriptionPromise.then(value => {
			expect(value.db).toBe("db3");
			expect(value.collectionsDescription.length).toBe(5);
			expect(value.collectionsDescription[0].collection).toBe("db3_coll_1");
			expect(value.collectionsDescription[1].collection).toBe("db3_coll_2");
			expect(value.collectionsDescription[2].collection).toBe("db3_coll_3");
			expect(value.collectionsDescription[3].collection).toBe("db3_coll_4");
			expect(value.collectionsDescription[4].collection).toBe("db3_coll_5");
		});
		return databaseDescriptionPromise;
	});

	it("dropCollection", () => {
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT, insecureChannel: true});
		const db1 = tigris.getDatabase("db3");

		const dropCollectionPromise = db1.dropCollection("db3_coll_2");
		dropCollectionPromise.then(value => {
			expect(value.status).toBe("dropped");
			expect(value.message).toBe("db3_coll_2 dropped successfully");
		});
		return dropCollectionPromise;
	});

	it("getCollection", () => {
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT, insecureChannel: true});
		const db1 = tigris.getDatabase("db3");
		const books = db1.getCollection<IBook>("books");
		expect(books.collectionName).toBe("books");
	});

	it("insert", () => {
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT, insecureChannel: true});
		const db1 = tigris.getDatabase("db3");
		const insertionPromise = db1.getCollection<IBook>("books").insert({
			author: "author name",
			id: 0,
			tags: ["science"],
			title: "science book"
		});
		insertionPromise.then(insertedBook => {
			expect(insertedBook.id).toBe(1);
		});
		return insertionPromise;
	});

	it("insert2", () => {
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT, insecureChannel: true});
		const db1 = tigris.getDatabase("db3");
		const insertionPromise = db1.getCollection<IBook2>("books").insert({
			id: 0,
			title: "science book",
			metadata: {
				publish_date: new Date(),
				num_pages: 100,
			}
		});
		insertionPromise.then(insertedBook => {
			expect(insertedBook.id).toBe(1);
		});
		return insertionPromise;
	});

	it("insertWithOptionalField", () => {
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT, insecureChannel: true});
		const db1 = tigris.getDatabase("db3");
		const randomNumber: number = Math.floor(Math.random() * 100);
		// pass the random number in author field. mock server reads author and sets as the
		// primaryKey field.
		const insertionPromise = db1.getCollection<IBook1>("books-with-optional-field").insert({
			author: "" + randomNumber,
			tags: ["science"],
			title: "science book"
		});
		insertionPromise.then(insertedBook => {
			expect(insertedBook.id).toBe(randomNumber);
		});
		return insertionPromise;
	});

	it("insertOrReplace", () => {
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT, insecureChannel: true});
		const db1 = tigris.getDatabase("db3");
		const insertOrReplacePromise = db1.getCollection<IBook>("books").insertOrReplace({
			author: "author name",
			id: 0,
			tags: ["science"],
			title: "science book"
		});
		insertOrReplacePromise.then(insertedOrReplacedBook => {
			expect(insertedOrReplacedBook.id).toBe(1);
		});
		return insertOrReplacePromise;
	});

	it("insertOrReplaceWithOptionalField", () => {
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT, insecureChannel: true});
		const db1 = tigris.getDatabase("db3");
		const randomNumber: number = Math.floor(Math.random() * 100);
		// pass the random number in author field. mock server reads author and sets as the
		// primaryKey field.
		const insertOrReplacePromise = db1.getCollection<IBook1>("books-with-optional-field").insertOrReplace({
			author: "" + randomNumber,
			tags: ["science"],
			title: "science book"
		});
		insertOrReplacePromise.then(insertedOrReplacedBook => {
			expect(insertedOrReplacedBook.id).toBe(randomNumber);
		});
		return insertOrReplacePromise;
	});

	it("delete", () => {
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT, insecureChannel: true});
		const db1 = tigris.getDatabase("db3");
		const deletionPromise = db1.getCollection<IBook>("books").delete({
			op: SelectorFilterOperator.EQ,
			fields: {
				id: 1
			}
		});
		deletionPromise.then(value => {
			expect(value.status).toBe("deleted: {\"id\":1}");
		});
		return deletionPromise;
	});

	it("update", () => {
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT, insecureChannel: true});
		const db1 = tigris.getDatabase("db3");
		const updatePromise = db1.getCollection<IBook>("books").update(
			{
				op: SelectorFilterOperator.EQ,
				fields: {
					id: 1
				}
			},
			{
				op: UpdateFieldsOperator.SET,
				fields: {
					title: "New Title"
				}
			});
		updatePromise.then(value => {
			expect(value.status).toBe("updated: {\"id\":1}, {\"$set\":{\"title\":\"New Title\"}}");
		});
		return updatePromise;
	});

	it("readOne", () => {
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT, insecureChannel: true});
		const db1 = tigris.getDatabase("db3");
		const readOnePromise = db1.getCollection<IBook>("books").findOne({
			op: SelectorFilterOperator.EQ,
			fields: {
				id: 1
			}
		});
		readOnePromise.then(value => {
			const book: IBook = <IBook>value;
			expect(book.id).toBe(1);
			expect(book.title).toBe("A Passage to India");
			expect(book.author).toBe("E.M. Forster");
			expect(book.tags).toStrictEqual(["Novel", "India"]);
		});
		return readOnePromise;
	});

	it("readOneRecordNotFound", () => {
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT, insecureChannel: true});
		const db1 = tigris.getDatabase("db3");
		const readOnePromise = db1.getCollection<IBook>("books").findOne({
			op: SelectorFilterOperator.EQ,
			fields: {
				id: 2
			}
		});
		readOnePromise.then((value) => {
			expect(value).toBe(undefined);
		});
		return readOnePromise;
	});

	it("readOneWithLogicalFilter", () => {
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT, insecureChannel: true});
		const db1 = tigris.getDatabase("db3");
		const readOnePromise: Promise<IBook | void> = db1.getCollection<IBook>("books").findOne({
			op: LogicalOperator.AND,
			selectorFilters: [
				{
					op: SelectorFilterOperator.EQ,
					fields: {
						id: 3
					}
				},
				{
					op: SelectorFilterOperator.EQ,
					fields: {
						title: "In Search of Lost Time"
					}
				}
			]
		});
		readOnePromise.then(value => {
			const book: IBook = <IBook>value;
			expect(book.id).toBe(3);
			expect(book.title).toBe("In Search of Lost Time");
			expect(book.author).toBe("Marcel Proust");
			expect(book.tags).toStrictEqual(["Novel", "Childhood"]);
		});
		return readOnePromise;
	});

	it("findManyStream", (done) => {
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT, insecureChannel: true});
		const db1 = tigris.getDatabase("db3");
		let bookCounter = 0;
		let success = true;
		success = true;
		db1.getCollection<IBook>("books").findManyStream({
			op: SelectorFilterOperator.EQ,
			fields: {
				author: "Marcel Proust"
			}
		}, {
			onEnd() {
				// test service is coded to return 4 books back
				expect(bookCounter).toBe(4);
				expect(success).toBe(true);
				done();
			},
			onNext(book: IBook) {
				bookCounter++;
				expect(book.author).toBe("Marcel Proust");
			},
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			onError(_error: Error) {
				success = false;
			}
		});
	});

	it("findAllStream", (done) => {
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT, insecureChannel: true});
		const db1 = tigris.getDatabase("db3");
		let bookCounter = 0;
		let success = true;
		success = true;
		db1.getCollection<IBook>("books").findAllStream(
			{
				onEnd() {
					// test service is coded to return 4 books back
					expect(bookCounter).toBe(4);
					expect(success).toBe(true);
					done();
				},
				onNext(book: IBook) {
					bookCounter++;
					expect(book.author).toBe("Marcel Proust");
				},
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				onError(_error: Error) {
					success = false;
				}
			});
	});

	it("findMany", () => {
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT, insecureChannel: true});
		const db1 = tigris.getDatabase("db3");
		const findManyBatchPromise: Promise<IBook[]> = db1.getCollection<IBook>("books").findMany({
			op: SelectorFilterOperator.EQ,
			fields: {
				author: "Marcel Proust"
			}
		});
		findManyBatchPromise.then(books => {
			expect(books.length).toBe(4);
		});
		return findManyBatchPromise;
	});

	it("findManyWithCollation", () => {
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT, insecureChannel: true});
		const db1 = tigris.getDatabase("db3");
		const options = new ReadRequestOptions();
		options.collation = {
			case: Case.CaseInsensitive,
		};
		const findManyBatchPromise: Promise<IBook[]> = db1.getCollection<IBook>("books").findMany({
			op: SelectorFilterOperator.EQ,
			fields: {
				author: "Marcel Proust"
			},	
		  },
		  null,
		  null,
		  options,
		);
		findManyBatchPromise.then(books => {
			expect(books.length).toBe(4);
		});
		return findManyBatchPromise;
	});


	it("search", (done) => {
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT, insecureChannel: true});
		const db3 = tigris.getDatabase("db3");
		let bookCounter = 0;
		let success = true;
		const request: SearchRequest<IBook> = {
			q: "philosophy",
			facets: {
				tags: Utility.createFacetQueryOptions()
			},
			sort: [
				{field: "id", order: SortOrder.DESC}
			]
		};
		const options: SearchRequestOptions = {
			collation: {
				case: Case.CaseInsensitive,
			},
		}
		db3.getCollection<IBook>("books")
			.search(request, {
				onEnd() {
					expect(bookCounter).toBe(TestTigrisService.BOOKS_B64_BY_ID.size);
					expect(success).toBe(true);
					done();
				},
				onError(error: Error) {
					success = false;
					fail(error);
				},
				onNext(searchResult: SearchResult<IBook>) {
					expect(searchResult.hits).toBeDefined();
					expect(searchResult.facets).toBeDefined();
					bookCounter += searchResult.hits.length;
				}
			}, 
			options);
	});

	it("beginTx", () => {
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT, insecureChannel: true});
		const db3 = tigris.getDatabase("db3");
		const beginTxPromise = db3.beginTransaction();
		beginTxPromise.then(value => {
			expect(value.id).toBe("id-test");
			expect(value.origin).toBe("origin-test");
		});
		return beginTxPromise;
	});

	it("commitTx", (done) => {
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT, insecureChannel: true});
		const db3 = tigris.getDatabase("db3");
		const beginTxPromise = db3.beginTransaction();
		beginTxPromise.then(session => {
			const commitTxResponse = session.commit();
			commitTxResponse.then(value => {
				expect(value.status).toBe("committed-test");
				done();
			});
		});
	});

	it("rollbackTx", (done) => {
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT, insecureChannel: true});
		const db3 = tigris.getDatabase("db3");
		const beginTxPromise = db3.beginTransaction();
		beginTxPromise.then(session => {
			const rollbackTransactionResponsePromise = session.rollback();
			rollbackTransactionResponsePromise.then(value => {
				expect(value.status).toBe("rollback-test");
				done();
			});
		});
	});

	it("transact", (done) => {
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT, insecureChannel: true});
		const txDB = tigris.getDatabase("test-tx");
		const books = txDB.getCollection<IBook>("books");
		txDB.transact(tx => {
			books.insert(
				{
					id: 1,
					author: "Alice",
					title: "Some book title"
				},
				tx
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
			).then(_value => {
				books.findOne({
					op: SelectorFilterOperator.EQ,
					fields: {
						id: 1
					}
				}, tx).then(() => {
					books.update({
							op: SelectorFilterOperator.EQ,
							fields: {
								id: 1
							}
						},
						{
							op: UpdateFieldsOperator.SET,
							fields: {
								"author":
									"Dr. Author"
							}
							// eslint-disable-next-line @typescript-eslint/no-unused-vars
						}, tx).then(() => {
						books.delete({
							op: SelectorFilterOperator.EQ,
							fields: {
								id: 1
							}
						}, tx).then(() => done());
					});
				});
			});
		});
	});

	it("createOrUpdateCollections", () => {
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT, insecureChannel: true});
		const db3 = tigris.getDatabase("db3");
		const bookSchema: TigrisSchema<IBook> = {
			id: {
				type: TigrisDataTypes.INT64,
				primary_key: {
					order: 1,
					autoGenerate: true
				}
			},
			author: {
				type: TigrisDataTypes.STRING
			},
			title: {
				type: TigrisDataTypes.STRING
			},
			tags: {
				type: TigrisDataTypes.ARRAY,
				items: {
					type: TigrisDataTypes.STRING
				}
			}
		};
		return db3.createOrUpdateCollection("books", bookSchema).then(value => {
			expect(value).toBeDefined();
		});
	});

	it("serverMetadata", () => {
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT, insecureChannel: true});
		const serverMetadataPromise = tigris.getServerMetadata();
		serverMetadataPromise.then(value => {
			expect(value.serverVersion).toBe("1.0.0-test-service");
		});
		return serverMetadataPromise;
	});

	it("events", (done) => {
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT, insecureChannel: true});
		const db = tigris.getDatabase("test_db");
		const collection = db.getCollection<IBook>("books");
		let success = true;

		collection.events({
			onNext(event: StreamEvent<IBook>) {
				expect(event.collection).toBe("books");
				expect(event.op).toBe("insert");
				expect(event.data.id).toBe(5);
				expect(event.data.author).toBe("Marcel Proust");
				expect(event.data.title).toBe("Time Regained");
				expect(event.last).toBe(true);
				expect(success).toBe(true);
				done();
			},
			onEnd() {
				// not expected to be called
			},
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			onError(error: Error) {
				success = false;
			}
		});
	});

	it ("publish", () => {
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT, insecureChannel: true});
		const db = tigris.getDatabase("test_db");
		const topic = db.getTopic<Alert>("test_topic");
		expect(topic.topicName).toBe("test_topic");

		const promise = topic.publish({
			id: 34,
			text: "test"
		});

		promise.then(alert => {
			expect(alert.id).toBe(34);
			expect(alert.text).toBe("test");
		});

		return promise;
	});

	it ("subscribe", (done) => {
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT, insecureChannel: true});
		const db = tigris.getDatabase("test_db");
		const topic = db.getTopic<Alert>("test_topic");
		let success = true;

		topic.subscribe({
			onNext(alert: Alert) {
				expect(alert.id).toBe(34);
				expect(alert.text).toBe("test");
				expect(success).toBe(true);
				done();
			},
			onEnd() {
				// not expected to be called
			},
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			onError(error: Error) {
				success = false;
			}
		});
	});

	it ("subscribeWithFilter", (done) => {
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT, insecureChannel: true});
		const db = tigris.getDatabase("test_db");
		const topic = db.getTopic<Alert>("test_topic");
		let success = true;

		topic.subscribeWithFilter({
				op: SelectorFilterOperator.EQ,
				fields: {
					text: "test"
				}
			},
			{
			onNext(alert: Alert) {
				expect(alert.id).toBe(34);
				expect(alert.text).toBe("test");
				expect(success).toBe(true);
				done();
			},
			onEnd() {
				// not expected to be called
			},
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			onError(error: Error) {
				success = false;
			}
		});
	});

	it ("subscribeToPartitions", (done) => {
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT, insecureChannel: true});
		const db = tigris.getDatabase("test_db");
		const topic = db.getTopic<Alert>("test_topic");
		let success = true;

		const partitions = new Array<number>();
		partitions.push(55);

		topic.subscribeToPartitions({
			onNext(alert: Alert) {
				expect(alert.id).toBe(34);
				expect(alert.text).toBe("test");
				expect(success).toBe(true);
				done();
			},
			onEnd() {
				// not expected to be called
			},
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			onError(error: Error) {
				success = false;
			}
		}, partitions);
	});
});

export interface IBook extends TigrisCollectionType {
	id: number;
	title: string;
	author: string;
	tags?: string[];
}

export interface IBook1 extends TigrisCollectionType {
	id?: number;
	title: string;
	author: string;
	tags?: string[];
}

export interface IBook2 extends TigrisCollectionType {
	id?: number;
	title: string;
	metadata: object;
}

export interface Alert extends TigrisTopicType {
	id: number;
	text: string;
}
