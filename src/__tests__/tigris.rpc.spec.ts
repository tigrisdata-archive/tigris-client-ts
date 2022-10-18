import {Server, ServerCredentials} from "@grpc/grpc-js";
import {TigrisService} from "../proto/server/v1/api_grpc_pb";
import TestService, {TestTigrisService} from "./test-service";
import {
	DatabaseOptions,
	DeleteRequestOptions,
	LogicalOperator,
	SelectorFilterOperator,
	StreamEvent,
	TigrisCollectionType,
	TigrisDataTypes,
	TigrisSchema, TigrisTopicSchema,
	TigrisTopicType,
	UpdateFieldsOperator,
	UpdateRequestOptions
} from "../types";
import {Tigris} from "../tigris";
import {Case, Collation, SearchRequest, SearchRequestOptions} from "../search/types";
import {Utility} from "../utility";
import {ObservabilityService} from "../proto/server/v1/observability_grpc_pb";
import TestObservabilityService from "./test-observability-service";
import {Readable} from "node:stream";
import {capture, spy } from "ts-mockito";

describe("rpc tests", () => {
	let server: Server;
	const SERVER_PORT = 5002;
	beforeAll((done) => {
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
		done();

	});
	beforeEach(() => {
		TestTigrisService.reset();
	});
	afterAll((done) => {
		server.forceShutdown();
		done();
	});

	it("listDatabase", () => {
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT});
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
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT});
		const dbCreationPromise = tigris.createDatabaseIfNotExists("db6", new DatabaseOptions());
		dbCreationPromise
			.then((value) => {
					expect(value.db).toBe("db6");
				},
			);

		return dbCreationPromise;
	});

	it("dropDatabase", () => {
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT});
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
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT});
		const db1 = tigris.getDatabase("db1");
		expect(db1.db).toBe("db1");
	});

	it("listCollections1", () => {
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT});
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
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT});
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
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT});
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
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT});
		const db1 = tigris.getDatabase("db3");

		const dropCollectionPromise = db1.dropCollection("db3_coll_2");
		dropCollectionPromise.then(value => {
			expect(value.status).toBe("dropped");
			expect(value.message).toBe("db3_coll_2 dropped successfully");
		});
		return dropCollectionPromise;
	});

	it("getCollection", () => {
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT});
		const db1 = tigris.getDatabase("db3");
		const books = db1.getCollection<IBook>("books");
		expect(books.collectionName).toBe("books");
	});

	it("insert", () => {
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT});
		const db1 = tigris.getDatabase("db3");
		const insertionPromise = db1.getCollection<IBook>("books").insertOne({
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
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT});
		const db1 = tigris.getDatabase("db3");
		const insertionPromise = db1.getCollection<IBook2>("books").insertOne({
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
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT});
		const db1 = tigris.getDatabase("db3");
		const randomNumber: number = Math.floor(Math.random() * 100);
		// pass the random number in author field. mock server reads author and sets as the
		// primaryKey field.
		const insertionPromise = db1.getCollection<IBook1>("books-with-optional-field").insertOne({
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
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT});
		const db1 = tigris.getDatabase("db3");
		const insertOrReplacePromise = db1.getCollection<IBook>("books").insertOrReplaceOne({
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
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT});
		const db1 = tigris.getDatabase("db3");
		const randomNumber: number = Math.floor(Math.random() * 100);
		// pass the random number in author field. mock server reads author and sets as the
		// primaryKey field.
		const insertOrReplacePromise = db1.getCollection<IBook1>("books-with-optional-field").insertOrReplaceOne({
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
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT});
		const db1 = tigris.getDatabase("db3");
		const deletionPromise = db1.getCollection<IBook>("books").deleteMany({
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

	it("deleteOne", () => {
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT});
		const collection = tigris.getDatabase("db3").getCollection<IBook>("books");
		const spyCollection = spy(collection);

		const expectedFilter = {id: 1};
		const expectedCollation: Collation = {case: Case.CaseInsensitive};
		const options = new DeleteRequestOptions(5, expectedCollation);

		const deletePromise = collection.deleteOne(expectedFilter, undefined, options);
		const [capturedFilter, capturedTx, capturedOptions] = capture(spyCollection.deleteMany).last();

		// filter passed as it is
		expect(capturedFilter).toBe(expectedFilter);
		// tx passed as it is
		expect(capturedTx).toBe(undefined);
		// options.collation passed as it is
		expect(capturedOptions.collation).toBe(expectedCollation);
		// options.limit === 1 while original was 5
		expect(capturedOptions.limit).toBe(1);

		return deletePromise;
	});

	it("update", () => {
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT});
		const db1 = tigris.getDatabase("db3");
		const updatePromise = db1.getCollection<IBook>("books").updateMany(
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
			expect(value.modifiedCount).toBe(1);
		});
		return updatePromise;
	});

	it("updateOne", () => {
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT});
		const collection = tigris.getDatabase("db3").getCollection<IBook>("books");
		const spyCollection = spy(collection);

		const expectedFilter = {id: 1};
		const expectedCollation: Collation = {case: Case.CaseInsensitive};
		const expectedUpdateFields = {title: "one"};
		const options = new UpdateRequestOptions(5, expectedCollation);

		const updatePromise = collection.updateOne(expectedFilter, expectedUpdateFields, undefined, options);
		const [capturedFilter, capturedFields, capturedTx, capturedOptions] = capture(spyCollection.updateMany).last();

		// filter passed as it is
		expect(capturedFilter).toBe(expectedFilter);
		// updateFields passed as it is
		expect(capturedFields).toBe(expectedUpdateFields);
		// tx passed as it is
		expect(capturedTx).toBe(undefined);
		// options.collation passed as it is
		expect(capturedOptions.collation).toBe(expectedCollation);
		// options.limit === 1 while original was 5
		expect(capturedOptions.limit).toBe(1);

		return updatePromise;
	});

	it("readOne", () => {
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT});
		const db1 = tigris.getDatabase("db3");
		const readOnePromise = db1.getCollection<IBook>("books").findOne( {
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
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT});
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
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT});
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

	describe("findMany", () => {
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT});
		const db = tigris.getDatabase("db3");

		it("with filter using for await on cursor", async () => {
			const cursor = db.getCollection<IBook>("books").findMany({
				op: SelectorFilterOperator.EQ,
				fields: {
					author: "Marcel Proust"
				}
			});

			let bookCounter = 0;
			for await (const book of cursor) {
				bookCounter++;
				expect(book.author).toBe("Marcel Proust");
			}
			expect(bookCounter).toBe(4);
		});

		it("finds all and retrieves results as array", () => {
			const cursor = db.getCollection<IBook>("books").findMany();
			const booksPromise = cursor.toArray();

			booksPromise.then(books => expect(books.length).toBe(4));
			return booksPromise;
		});

		it("finds all and streams through results", async () => {
			const cursor = db.getCollection<IBook>("books").findMany();
			const booksIterator = cursor.stream();

			let bookCounter = 0;
			for await (const book of booksIterator) {
				bookCounter++;
				expect(book.author).toBe("Marcel Proust");
			}
			expect(bookCounter).toBe(4);
		});

		it("throws an error", async () => {
			const cursor = db.getCollection<IBook>("books").findMany({
				op: SelectorFilterOperator.EQ,
				fields: {
					id: -1
				}
			});

			try {
				for await (const book of cursor) {
					console.log(book);
				}
			} catch (err) {
				expect((err as Error).message).toContain("unknown record requested");
			}
			return cursor;
		});
	});

	it("search", () => {
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT});
		const db3 = tigris.getDatabase("db3");
		const options: SearchRequestOptions = {
			page: 2,
			perPage: 12
		}
		const request: SearchRequest<IBook> = {
			q: "philosophy",
			facets: {
				tags: Utility.createFacetQueryOptions()
			}
		};

		const searchPromise = db3.getCollection<IBook>("books").search(request, options);

		searchPromise.then(res => {
			expect(res.meta.found).toBe(5);
			expect(res.meta.totalPages).toBe(5);
			expect(res.meta.page.current).toBe(options.page);
			expect(res.meta.page.size).toBe(options.perPage);
		});

		return searchPromise;
	});

	it("searchStream using iteration", async () => {
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT});
		const db3 = tigris.getDatabase("db3");
		const request: SearchRequest<IBook> = {
			q: "philosophy",
			facets: {
				tags: Utility.createFacetQueryOptions()
			}
		};
		let bookCounter = 0;

		const searchIterator = db3.getCollection<IBook>("books").searchStream(request);
		// for await loop the iterator
		for await (const searchResult of searchIterator) {
			expect(searchResult.hits).toBeDefined();
			expect(searchResult.facets).toBeDefined();
			bookCounter += searchResult.hits.length;
		}
		expect(bookCounter).toBe(TestTigrisService.BOOKS_B64_BY_ID.size);
	});

	it("searchStream using next", async () => {
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT});
		const db3 = tigris.getDatabase("db3");
		const request: SearchRequest<IBook> = {
			q: "philosophy",
			facets: {
				tags: Utility.createFacetQueryOptions()
			}
		};
		let bookCounter = 0;

		const searchIterator = db3.getCollection<IBook>("books").searchStream(request);
		let iterableResult = await searchIterator.next();
		while (!iterableResult.done) {
			const searchResult = await iterableResult.value;
			expect(searchResult.hits).toBeDefined();
			expect(searchResult.facets).toBeDefined();
			bookCounter += searchResult.hits.length;
			iterableResult = await searchIterator.next();
		}
		expect(bookCounter).toBe(TestTigrisService.BOOKS_B64_BY_ID.size);
	});

	it("beginTx", () => {
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT});
		const db3 = tigris.getDatabase("db3");
		const beginTxPromise = db3.beginTransaction();
		beginTxPromise.then(value => {
			expect(value.id).toBe("id-test");
			expect(value.origin).toBe("origin-test");
		});
		return beginTxPromise;
	});

	it("commitTx", (done) => {
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT});
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
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT});
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
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT});
		const txDB = tigris.getDatabase("test-tx");
		const books = txDB.getCollection<IBook>("books");
		txDB.transact(tx => {
			books.insertOne(
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
				}, undefined, tx).then(() => {
					books.updateMany({
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
						books.deleteMany({
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
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT});
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

	it("createOrUpdateTopic", () => {
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT});
		const db = tigris.getDatabase("test_db");
		const alertSchema: TigrisTopicSchema<Alert> = {
			id: {
				type: TigrisDataTypes.INT64,
				key: {
					order: 1
				}
			},
			name: {
				type: TigrisDataTypes.STRING,
				key: {
					order: 2
				}
			},
			text: {
				type: TigrisDataTypes.STRING
			}
		};
		return db.createOrUpdateTopic("alerts", alertSchema).then(value => {
			expect(value).toBeDefined();
		});
	});

	it("serverMetadata", () => {
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT});
		const serverMetadataPromise = tigris.getServerMetadata();
		serverMetadataPromise.then(value => {
			expect(value.serverVersion).toBe("1.0.0-test-service");
		});
		return serverMetadataPromise;
	});

	it("events", (done) => {
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT});
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

	it("publish", () => {
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT});
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

	it("subscribe using callback", (done) => {
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT});
		const db = tigris.getDatabase("test_db");
		const topic = db.getTopic<Alert>("test_topic");
		let success = true;
		const expectedIds = new Set<number>(TestTigrisService.ALERTS_B64_BY_ID.keys());

		topic.subscribe({
			onNext(alert: Alert) {
				expect(expectedIds).toContain(alert.id);
				expectedIds.delete(alert.id);
			},
			onEnd() {
				expect(success).toBe(true);
				done();
			},
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			onError(error: Error) {
				success = false;
			}
		});
	});

	it("subscribe using stream", (done) => {
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT});
		const db = tigris.getDatabase("test_db");
		const topic = db.getTopic<Alert>("test_topic");
		const subscription: Readable = topic.subscribe() as Readable;
		const expectedIds = new Set<number>(TestTigrisService.ALERTS_B64_BY_ID.keys());
		let success = true;

		subscription.on("data", (alert) =>{
			expect(expectedIds).toContain(alert.id);
			expectedIds.delete(alert.id);
		});
		subscription.on("error", () => {
			success = false;
		});
		subscription.on("end", () => {
			expect(success).toBe(true);
			done();
		});
	});

	it("subscribeWithFilter", (done) => {
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT});
		const db = tigris.getDatabase("test_db");
		const topic = db.getTopic<Alert>("test_topic");
		let success = true;
		const expectedIds = new Set<number>(TestTigrisService.ALERTS_B64_BY_ID.keys());

		topic.subscribeWithFilter({
				op: SelectorFilterOperator.EQ,
				fields: {
					text: "test"
				}
			},
			{
				onNext(alert: Alert) {
					expect(expectedIds).toContain(alert.id);
					expectedIds.delete(alert.id);
				},
				onEnd() {
					expect(success).toBe(true);
					done();
				},
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				onError(error: Error) {
					success = false;
				}
			});
	});

	it("subscribeToPartitions", (done) => {
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT});
		const db = tigris.getDatabase("test_db");
		const topic = db.getTopic<Alert>("test_topic");
		let success = true;
		const expectedIds = new Set<number>(TestTigrisService.ALERTS_B64_BY_ID.keys());

		const partitions = new Array<number>();
		partitions.push(55);

		topic.subscribeToPartitions(partitions,{
			onNext(alert: Alert) {
				expect(expectedIds).toContain(alert.id);
				expectedIds.delete(alert.id);
			},
			onEnd() {
				expect(success).toBe(true);
				done();
			},
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			onError(error: Error) {
				success = false;
			}
		});
	});

	it("findMany in topic", async () => {
		const tigris = new Tigris({serverUrl: "0.0.0.0:" + SERVER_PORT});
		const db = tigris.getDatabase("test_db");
		const topic = db.getTopic<Alert>("test_topic");
		const expectedIds = new Set<number>(TestTigrisService.ALERTS_B64_BY_ID.keys());
		let seenAlerts = 0;

		for await (const alert of topic.findMany()) {
			expect(expectedIds).toContain(alert.id);
			expectedIds.delete(alert.id);
			seenAlerts++;
		}

		expect(seenAlerts).toBe(2);
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
	name?: number;
	text: string;
}
