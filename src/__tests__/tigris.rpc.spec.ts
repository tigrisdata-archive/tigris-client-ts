import { Server, ServerCredentials, ServiceError } from "@grpc/grpc-js";
import { TigrisClient, TigrisService } from "../proto/server/v1/api_grpc_pb";
import TestService, { Branch, TestTigrisService } from "./test-service";
import TestServiceCache, { TestCacheService } from "./test-cache-service";

import {
	DeleteQueryOptions,
	LogicalOperator,
	SelectorFilterOperator,
	TigrisCollectionType,
	TigrisDataTypes,
	TigrisSchema,
	UpdateFieldsOperator,
	UpdateQueryOptions,
} from "../types";
import { Tigris, TigrisClientConfig } from "../tigris";
import { Case, Collation, SearchQuery, SearchResult } from "../search/types";
import { Utility } from "../utility";
import { ObservabilityService } from "../proto/server/v1/observability_grpc_pb";
import TestObservabilityService from "./test-observability-service";
import { anything, capture, reset, spy, when } from "ts-mockito";
import { TigrisCollection } from "../decorators/tigris-collection";
import { PrimaryKey } from "../decorators/tigris-primary-key";
import { Field } from "../decorators/tigris-field";
import { SearchIterator } from "../consumables/search-iterator";
import { CacheService } from "../proto/server/v1/cache_grpc_pb";
import { DatabaseBranchError } from "../error";
import { Status } from "@grpc/grpc-js/build/src/constants";
import { Status as TigrisStatus } from "../constants";

describe("rpc tests", () => {
	let server: Server;
	const testConfig = { serverUrl: "localhost:" + 5002, projectName: "db1", branch: "unit-tests" };

	beforeAll((done) => {
		server = new Server();
		TestTigrisService.reset();
		server.addService(TigrisService, TestService.handler.impl);
		server.addService(CacheService, TestServiceCache.handler.impl);
		server.addService(ObservabilityService, TestObservabilityService.handler.impl);
		server.bindAsync(
			testConfig.serverUrl,
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
		TestCacheService.reset();
	});

	afterAll((done) => {
		server.forceShutdown();
		done();
	});

	it("getDatabase", async () => {
		const tigris = new Tigris(testConfig);
		const db1 = await tigris.getDatabase();
		expect(db1.db).toBe("db1");
	});

	it("listCollections1", async () => {
		const tigris = new Tigris(testConfig);
		const db1 = await tigris.getDatabase();

		const listCollectionPromise = db1.listCollections();
		listCollectionPromise.then((value) => {
			expect(value.length).toBe(5);
			expect(value[0].name).toBe("db1_coll_1");
			expect(value[1].name).toBe("db1_coll_2");
			expect(value[2].name).toBe("db1_coll_3");
			expect(value[3].name).toBe("db1_coll_4");
			expect(value[4].name).toBe("db1_coll_5");
		});
		return listCollectionPromise;
	});

	it("listCollections2", async () => {
		const tigris = new Tigris({ ...testConfig, projectName: "db3" });
		const db1 = await tigris.getDatabase();

		const listCollectionPromise = db1.listCollections();
		listCollectionPromise.then((value) => {
			expect(value.length).toBe(5);
			expect(value[0].name).toBe("db3_coll_1");
			expect(value[1].name).toBe("db3_coll_2");
			expect(value[2].name).toBe("db3_coll_3");
			expect(value[3].name).toBe("db3_coll_4");
			expect(value[4].name).toBe("db3_coll_5");
		});
		return listCollectionPromise;
	});

	it("describeDatabase", async () => {
		const tigris = new Tigris({ ...testConfig, projectName: "db3" });
		const db1 = await tigris.getDatabase();

		const databaseDescriptionPromise = db1.describe();
		databaseDescriptionPromise.then((value) => {
			expect(value.collectionsDescription.length).toBe(5);
			expect(value.collectionsDescription[0].collection).toBe("db3_coll_1");
			expect(value.collectionsDescription[1].collection).toBe("db3_coll_2");
			expect(value.collectionsDescription[2].collection).toBe("db3_coll_3");
			expect(value.collectionsDescription[3].collection).toBe("db3_coll_4");
			expect(value.collectionsDescription[4].collection).toBe("db3_coll_5");
		});
		return databaseDescriptionPromise;
	});

	it("dropCollection", async () => {
		const tigris = new Tigris({ ...testConfig, projectName: "db3" });
		const db1 = await tigris.getDatabase();

		const dropCollectionPromise = db1.dropCollection("db3_coll_2");
		dropCollectionPromise.then((value) => {
			expect(value.status).toBe("dropped");
			expect(value.message).toBe("db3_coll_2 dropped successfully");
		});
		return dropCollectionPromise;
	});

	it("getCollection", async () => {
		const tigris = new Tigris({ ...testConfig, projectName: "db3" });
		const db1 = await tigris.getDatabase();
		const books = db1.getCollection<IBook>("books");
		expect(books.collectionName).toBe("books");
	});

	it("insert", async () => {
		const tigris = new Tigris({ ...testConfig, projectName: "db3" });
		const db1 = await tigris.getDatabase();
		const insertionPromise = db1.getCollection<IBook>("books").insertOne({
			author: "author name",
			id: 0,
			tags: ["science"],
			title: "science book",
		});
		insertionPromise.then((insertedBook) => {
			expect(insertedBook.id).toBe(1);
		});
		return insertionPromise;
	});

	it("insert2", async () => {
		const tigris = new Tigris({ ...testConfig, projectName: "db3" });
		const db1 = await tigris.getDatabase();
		const insertionPromise = db1.getCollection<IBook2>("books").insertOne({
			id: 0,
			title: "science book",
			metadata: {
				publish_date: new Date(),
				num_pages: 100,
			},
		});
		insertionPromise.then((insertedBook) => {
			expect(insertedBook.id).toBe(1);
		});
		return insertionPromise;
	});

	it("insert_multi_pk", async () => {
		const tigris = new Tigris({ ...testConfig, projectName: "db3" });
		const db1 = await tigris.getDatabase();
		const insertionPromise = db1.getCollection<IBookMPK>("books-multi-pk").insertOne({
			id: 0,
			id2: 0,
			title: "science book",
			metadata: {
				publish_date: new Date(),
				num_pages: 100,
			},
		});
		insertionPromise.then((insertedBook) => {
			expect(insertedBook.id).toBe(1);
			expect(insertedBook.id2).toBe(11);
		});
		return insertionPromise;
	});

	it("insert_multi_pk_many", async () => {
		const tigris = new Tigris({ ...testConfig, projectName: "db3" });
		const db1 = await tigris.getDatabase();
		const insertionPromise = db1.getCollection<IBookMPK>("books-multi-pk").insertMany([
			{
				id: 0,
				id2: 0,
				title: "science book",
				metadata: {
					publish_date: new Date(),
					num_pages: 100,
				},
			},
			{
				id: 0,
				id2: 0,
				title: "science book",
				metadata: {
					publish_date: new Date(),
					num_pages: 100,
				},
			},
		]);
		insertionPromise.then((insertedBook) => {
			expect(insertedBook.length).toBe(2);
			expect(insertedBook[0].id).toBe(1);
			expect(insertedBook[0].id2).toBe(11);
			expect(insertedBook[1].id).toBe(2);
			expect(insertedBook[1].id2).toBe(21);
		});
		return insertionPromise;
	});

	it("insertWithOptionalField", async () => {
		const tigris = new Tigris({ ...testConfig, projectName: "db3" });
		const db1 = await tigris.getDatabase();
		const randomNumber: number = Math.floor(Math.random() * 100);
		// pass the random number in author field. mock server reads author and sets as the
		// primaryKey field.
		const insertionPromise = db1.getCollection<IBook1>("books-with-optional-field").insertOne({
			author: "" + randomNumber,
			tags: ["science"],
			title: "science book",
		});
		insertionPromise.then((insertedBook) => {
			expect(insertedBook.id).toBe(randomNumber);
		});
		return insertionPromise;
	});

	it("insertOrReplace", async () => {
		const tigris = new Tigris({ ...testConfig, projectName: "db3" });
		const db1 = await tigris.getDatabase();
		const insertOrReplacePromise = db1.getCollection<IBook>("books").insertOrReplaceOne({
			author: "author name",
			id: 0,
			tags: ["science"],
			title: "science book",
		});
		insertOrReplacePromise.then((insertedOrReplacedBook) => {
			expect(insertedOrReplacedBook.id).toBe(1);
		});
		return insertOrReplacePromise;
	});

	it("insertOrReplaceWithOptionalField", async () => {
		const tigris = new Tigris({ ...testConfig, projectName: "db3" });
		const db1 = await tigris.getDatabase();
		const randomNumber: number = Math.floor(Math.random() * 100);
		// pass the random number in author field. mock server reads author and sets as the
		// primaryKey field.
		const insertOrReplacePromise = db1
			.getCollection<IBook1>("books-with-optional-field")
			.insertOrReplaceOne({
				author: "" + randomNumber,
				tags: ["science"],
				title: "science book",
			});
		insertOrReplacePromise.then((insertedOrReplacedBook) => {
			expect(insertedOrReplacedBook.id).toBe(randomNumber);
		});
		return insertOrReplacePromise;
	});

	it("delete", async () => {
		const tigris = new Tigris({ ...testConfig, projectName: "db3" });
		const db1 = await tigris.getDatabase();
		const deletionPromise = db1.getCollection<IBook>(IBook).deleteMany({
			filter: { id: 1 },
		});
		deletionPromise
			.then((value) => {
				expect(value.status).toBe('deleted: {"id":1}');
			})
			.catch((r) => console.log(r));
		return deletionPromise;
	});

	it("deleteOne", async () => {
		const tigris = new Tigris({ ...testConfig, projectName: "db3" });
		const collection = (await tigris.getDatabase()).getCollection<IBook>("books");
		const spyCollection = spy(collection);

		const expectedFilter = { id: 1 };
		const expectedCollation: Collation = { case: Case.CaseInsensitive };
		const options = new DeleteQueryOptions(5, expectedCollation);

		const deletePromise = collection.deleteOne({ filter: expectedFilter, options: options });
		const [capturedQuery, capturedTx] = capture(spyCollection.deleteMany).last();

		// filter passed as it is
		expect(capturedQuery.filter).toBe(expectedFilter);
		// tx passed as it is
		expect(capturedTx).toBe(undefined);
		// options.collation passed as it is
		expect(capturedQuery.options.collation).toBe(expectedCollation);
		// options.limit === 1 while original was 5
		expect(capturedQuery.options.limit).toBe(1);

		return deletePromise;
	});

	it("update", async () => {
		const tigris = new Tigris({ ...testConfig, projectName: "db3" });
		const db1 = await tigris.getDatabase();
		const updatePromise = db1.getCollection<IBook>("books").updateMany({
			filter: {
				op: SelectorFilterOperator.EQ,
				fields: {
					id: 1,
				},
			},
			fields: {
				op: UpdateFieldsOperator.SET,
				fields: {
					title: "New Title",
				},
			},
		});
		updatePromise.then((value) => {
			expect(value.status).toBe(TigrisStatus.Updated);
			expect(value.modifiedCount).toBe(1);
		});
		return updatePromise;
	});

	it("updateOne", async () => {
		const tigris = new Tigris({ ...testConfig, projectName: "db3" });
		const collection = (await tigris.getDatabase()).getCollection<IBook>("books");
		const spyCollection = spy(collection);

		const expectedFilter = { id: 1 };
		const expectedCollation: Collation = { case: Case.CaseInsensitive };
		const expectedUpdateFields = { title: "one" };
		const options = new UpdateQueryOptions(5, expectedCollation);

		const updatePromise = collection.updateOne({
			filter: expectedFilter,
			fields: expectedUpdateFields,
			options: options,
		});
		const [capturedQuery, capturedTx] = capture(spyCollection.updateMany).last();

		// filter passed as it is
		expect(capturedQuery.filter).toBe(expectedFilter);
		// updateFields passed as it is
		expect(capturedQuery.fields).toBe(expectedUpdateFields);
		// tx passed as it is
		expect(capturedTx).toBe(undefined);
		// options.collation passed as it is
		expect(capturedQuery.options.collation).toBe(expectedCollation);
		// options.limit === 1 while original was 5
		expect(capturedQuery.options.limit).toBe(1);

		return updatePromise;
	});

	it("readOne", async () => {
		const tigris = new Tigris({ ...testConfig, projectName: "db3" });
		const db1 = await tigris.getDatabase();
		const readOnePromise = db1.getCollection<IBook>("books").findOne({
			filter: {
				op: SelectorFilterOperator.EQ,
				fields: {
					id: 1,
				},
			},
		});
		readOnePromise.then((value) => {
			const book: IBook = <IBook>value;
			expect(book.id).toBe(1);
			expect(book.title).toBe("A Passage to India");
			expect(book.author).toBe("E.M. Forster");
			expect(book.tags).toStrictEqual(["Novel", "India"]);
		});
		return readOnePromise;
	});

	it("readOneRecordNotFound", async () => {
		const tigris = new Tigris({ ...testConfig, projectName: "db3" });
		const db1 = await tigris.getDatabase();
		const readOnePromise = db1.getCollection<IBook>("books").findOne({
			filter: {
				op: SelectorFilterOperator.EQ,
				fields: {
					id: 2,
				},
			},
		});
		readOnePromise.then((value) => {
			expect(value).toBe(undefined);
		});
		return readOnePromise;
	});

	it("readOneWithLogicalFilter", async () => {
		const tigris = new Tigris({ ...testConfig, projectName: "db3" });
		const db1 = await tigris.getDatabase();
		const readOnePromise: Promise<IBook | void> = db1.getCollection<IBook>("books").findOne({
			filter: {
				op: LogicalOperator.AND,
				selectorFilters: [
					{
						op: SelectorFilterOperator.EQ,
						fields: {
							id: 3,
						},
					},
					{
						op: SelectorFilterOperator.EQ,
						fields: {
							title: "In Search of Lost Time",
						},
					},
				],
			},
		});
		readOnePromise.then((value) => {
			const book: IBook = <IBook>value;
			expect(book.id).toBe(3);
			expect(book.title).toBe("In Search of Lost Time");
			expect(book.author).toBe("Marcel Proust");
			expect(book.tags).toStrictEqual(["Novel", "Childhood"]);
		});
		return readOnePromise;
	});

	describe("findMany", () => {
		const tigris = new Tigris({ ...testConfig, projectName: "db3" });

		it("with filter using for await on cursor", async () => {
			const db = await tigris.getDatabase();
			const cursor = db.getCollection<IBook>("books").findMany({
				filter: {
					op: SelectorFilterOperator.EQ,
					fields: {
						author: "Marcel Proust",
					},
				},
			});

			let bookCounter = 0;
			for await (const book of cursor) {
				bookCounter++;
				expect(book.author).toBe("Marcel Proust");
			}
			expect(bookCounter).toBe(4);
		});

		it("finds all and retrieves results as array", async () => {
			const db = await tigris.getDatabase();
			const cursor = db.getCollection<IBook>("books").findMany();
			const booksPromise = cursor.toArray();

			booksPromise.then((books) => expect(books.length).toBe(4));
			return booksPromise;
		});

		it("finds all and streams through results", async () => {
			const db = await tigris.getDatabase();
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
			const db = await tigris.getDatabase();
			const cursor = db.getCollection<IBook>("books").findMany({
				filter: {
					op: SelectorFilterOperator.EQ,
					fields: {
						id: -1,
					},
				},
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

	describe("search", () => {
		const tigris = new Tigris({ ...testConfig, projectName: "db3" });

		describe("with page number", () => {
			const pageNumber = 2;

			it("returns a promise", async () => {
				const db = await tigris.getDatabase();
				const query: SearchQuery<IBook> = {
					q: "philosophy",
					facets: {
						tags: Utility.createFacetQueryOptions(),
					},
				};

				const maybePromise = db.getCollection<IBook>("books").search(query, pageNumber);
				expect(maybePromise).toBeInstanceOf(Promise);

				maybePromise.then((res: SearchResult<IBook>) => {
					expect(res.meta.found).toBe(5);
					expect(res.meta.totalPages).toBe(5);
					expect(res.meta.page.current).toBe(pageNumber);
				});
				return maybePromise;
			});
		});

		describe("without explicit page number", () => {
			it("returns an iterator", async () => {
				const db = await tigris.getDatabase();
				const query: SearchQuery<IBook> = {
					q: "philosophy",
					facets: {
						tags: Utility.createFacetQueryOptions(),
					},
				};
				let bookCounter = 0;

				const maybeIterator = db.getCollection<IBook>("books").search(query);
				expect(maybeIterator).toBeInstanceOf(SearchIterator);

				// for await loop the iterator
				for await (const searchResult of maybeIterator) {
					expect(searchResult.hits).toBeDefined();
					expect(searchResult.facets).toBeDefined();
					bookCounter += searchResult.hits.length;
				}
				expect(bookCounter).toBe(TestTigrisService.BOOKS_B64_BY_ID.size);
			});
		});
	});

	it("beginTx", async () => {
		const tigris = new Tigris({ ...testConfig, projectName: "db3" });
		const db3 = await tigris.getDatabase();
		const beginTxPromise = db3.beginTransaction();
		beginTxPromise.then((value) => {
			expect(value.id).toBe("id-test");
			expect(value.origin).toBe("origin-test");
		});
		return beginTxPromise;
	});

	it("commitTx", async () => {
		const tigris = new Tigris({ ...testConfig, projectName: "db3" });
		const db3 = await tigris.getDatabase();
		const beginTxPromise = db3.beginTransaction();
		beginTxPromise.then((session) => {
			const commitTxResponse = session.commit();
			commitTxResponse.then((value) => {
				expect(value.status).toBe(TigrisStatus.Success);
			});
			return beginTxPromise;
		});
	});

	it("rollbackTx", async () => {
		const tigris = new Tigris({ ...testConfig, projectName: "db3" });
		const db3 = await tigris.getDatabase();
		const beginTxPromise = db3.beginTransaction();
		beginTxPromise.then((session) => {
			const rollbackTransactionResponsePromise = session.rollback();
			rollbackTransactionResponsePromise.then((value) => {
				expect(value.status).toBe(TigrisStatus.Success);
			});
		});
		return beginTxPromise;
	});

	it("transact", async () => {
		const tigris = new Tigris({ projectName: "test-tx", ...testConfig });
		const txDB = await tigris.getDatabase();
		const books = txDB.getCollection<IBook>("books");
		return txDB.transact((tx) => {
			books
				.insertOne(
					{
						id: 1,
						author: "Alice",
						title: "Some book title",
					},
					tx
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
				)
				.then((_value) => {
					books
						.findOne(
							{
								filter: {
									op: SelectorFilterOperator.EQ,
									fields: {
										id: 1,
									},
								},
							},
							tx
						)
						.then(() => {
							books
								.updateMany(
									{
										filter: {
											op: SelectorFilterOperator.EQ,
											fields: {
												id: 1,
											},
										},
										fields: {
											op: UpdateFieldsOperator.SET,
											fields: {
												author: "Dr. Author",
											},
										},
									},
									tx
								)
								.then(() => {
									books
										.deleteMany(
											{
												filter: {
													op: SelectorFilterOperator.EQ,
													fields: {
														id: 1,
													},
												},
											},
											tx
										)
										.then();
								});
						});
				});
		});
	});

	it("createOrUpdateCollections", async () => {
		const tigris = new Tigris({ ...testConfig, projectName: "db3" });
		const db3 = await tigris.getDatabase();
		const bookSchema: TigrisSchema<IBook> = {
			id: {
				type: TigrisDataTypes.INT64,
				primary_key: {
					order: 1,
					autoGenerate: true,
				},
			},
			author: {
				type: TigrisDataTypes.STRING,
			},
			title: {
				type: TigrisDataTypes.STRING,
			},
			tags: {
				type: TigrisDataTypes.ARRAY,
				items: {
					type: TigrisDataTypes.STRING,
				},
			},
		};
		return db3.createOrUpdateCollection("books", bookSchema).then((value) => {
			expect(value).toBeDefined();
		});
	});

	it("serverMetadata", async () => {
		const tigris = new Tigris({ ...testConfig, projectName: "db3" });
		const serverMetadataPromise = tigris.getServerMetadata();
		serverMetadataPromise.then((value) => {
			expect(value.serverVersion).toBe("1.0.0-test-service");
		});
		return serverMetadataPromise;
	});

	it("createCache", async () => {
		const tigris = new Tigris({ ...testConfig, projectName: "db3" });
		const cacheC1Promise = tigris.createCacheIfNotExists("c1");
		cacheC1Promise.then((value) => {
			expect(value.getCacheName()).toBe("c1");
		});
		return cacheC1Promise;
	});

	it("listCaches", async () => {
		const tigris = new Tigris({ ...testConfig, projectName: "db3" });
		for (let i = 0; i < 5; i++) {
			await tigris.createCacheIfNotExists("c" + i);
		}
		const listCachesResponse = await tigris.listCaches();
		for (let i = 0; i < 5; i++) {
			let found = false;
			for (let cache of listCachesResponse.caches) {
				if (cache.name === "c" + i) {
					if (found) {
						throw new Error("already found " + cache.name);
					}
					found = true;
					break;
				}
			}
			expect(found).toBe(true);
		}
	});

	it("deleteCache", async () => {
		const tigris = new Tigris({ ...testConfig, projectName: "db3" });
		for (let i = 0; i < 5; i++) {
			await tigris.createCacheIfNotExists("c" + i);
		}
		let listCachesResponse = await tigris.listCaches();
		expect(listCachesResponse.caches.length).toBe(5);

		const deleteResponse = await tigris.deleteCache("c3");
		expect(deleteResponse.status).toBe("deleted");

		listCachesResponse = await tigris.listCaches();
		expect(listCachesResponse.caches.length).toBe(4);

		await tigris.deleteCache("c2");
		listCachesResponse = await tigris.listCaches();
		expect(listCachesResponse.caches.length).toBe(3);

		// deleting non-existing cache
		let errored = false;
		try {
			await tigris.deleteCache("c3");
		} catch (error) {
			errored = true;
		}
		expect(errored).toBe(true);

		listCachesResponse = await tigris.listCaches();
		expect(listCachesResponse.caches.length).toBe(3);
	});

	it("cacheCrud", async () => {
		const tigris = new Tigris({ ...testConfig, projectName: "db3" });
		const c1 = await tigris.createCacheIfNotExists("c1");

		await c1.set("k1", "val1");
		expect((await c1.get("k1")).value).toBe("val1");

		await c1.set("k1", "val1-new");
		expect((await c1.get("k1")).value).toBe("val1-new");

		await c1.set("k2", 123);
		expect((await c1.get("k2")).value).toBe(123);

		await c1.set("k3", true);
		expect((await c1.get("k3")).value).toBe(true);

		await c1.set("k4", { a: "b", n: 12 });
		expect((await c1.get("k4")).value).toEqual({ a: "b", n: 12 });

		const keys = await c1.keys();
		expect(keys).toContain("k1");
		expect(keys).toContain("k2");
		expect(keys).toContain("k3");
		expect(keys).toContain("k4");
		expect(keys).toHaveLength(4);

		await c1.del("k1");
		let errored = false;

		try {
			await c1.get("k1");
		} catch (error) {
			errored = true;
		}
		expect(errored).toBe(true);

		// k1 is deleted
		const keysNew = await c1.keys();
		expect(keysNew).toContain("k2");
		expect(keysNew).toContain("k3");
		expect(keysNew).toContain("k4");
		expect(keysNew).toHaveLength(3);

		// getset
		let getSetResp = await c1.getSet("k2", 123_456);
		expect(getSetResp.old_value).toBe(123);

		getSetResp = await c1.getSet("k2", 123_457);
		expect(getSetResp.old_value).toBe(123_456);

		// getset for new key
		try {
			getSetResp = await c1.getSet("k6", "val6");
			expect(getSetResp.old_value).toBeUndefined();
		} catch (error) {
			console.log(error);
		}
	});

	describe("DB branching", () => {
		const tigris = new Tigris(testConfig);

		it("creates a new branch", async () => {
			expect.hasAssertions();
			const db = await tigris.getDatabase();
			const createResp = db.createBranch("staging");

			return createResp.then((r) => expect(r.status).toBe("created"));
		});

		it("fails to create existing branch", async () => {
			expect.assertions(2);
			const db = await tigris.getDatabase();
			const createResp = db.createBranch(Branch.Existing);
			createResp.catch((r) => {
				expect((r as ServiceError).code).toEqual(Status.ALREADY_EXISTS);
			});

			return expect(createResp).rejects.toBeDefined();
		});

		it("deletes a branch successfully", async () => {
			expect.hasAssertions();
			const db = await tigris.getDatabase();
			const deleteResp = db.deleteBranch("staging");

			return deleteResp.then((r) => expect(r.status).toBe("deleted"));
		});

		it("fails to delete a branch if not existing already", async () => {
			expect.assertions(2);
			const db = await tigris.getDatabase();
			const deleteResp = db.deleteBranch(Branch.NotFound);
			deleteResp.catch((r) => {
				expect((r as ServiceError).code).toEqual(Status.NOT_FOUND);
			});

			return expect(deleteResp).rejects.toBeDefined();
		});
	});

	describe("initializeDB() tests", () => {
		let mockedUtil;
		let config: TigrisClientConfig = {
			serverUrl: testConfig.serverUrl,
			projectName: testConfig.projectName,
		};
		beforeEach(() => {
			mockedUtil = spy(Utility);
		});

		afterEach(() => {
			reset(mockedUtil);
		});

		it("uses 'default branch' when no branch name given", async () => {
			expect(config["branch"]).toBeUndefined();
			when(mockedUtil.branchNameFromEnv(anything())).thenReturn(undefined);
			const tigris = new Tigris(config);
			const dbPromise = tigris.getDatabase();
			const db = await dbPromise;
			expect(db.branch).toBe("");
			return dbPromise;
		});

		it("accepts empty string for branch name", async () => {
			when(mockedUtil.branchNameFromEnv(anything())).thenReturn({
				name: "",
				dynamicCreation: false,
			});
			const tigris = new Tigris({ ...config, branch: "" });
			const dbPromise = tigris.getDatabase();
			const db = await dbPromise;
			expect(db.branch).toBe("");
			return dbPromise;
		});

		it("skips creating branch for existing", async () => {
			when(mockedUtil.branchNameFromEnv(anything())).thenReturn({
				name: "staging",
				dynamicCreation: true,
			});
			const tigris = new Tigris(config);
			const dbPromise = tigris.getDatabase();
			const db = await dbPromise;
			expect(db.branch).toBe("staging");
			return dbPromise;
		});

		it("creates templated branch if not exist", async () => {
			when(mockedUtil.branchNameFromEnv(anything())).thenReturn({
				name: "fork_feature_1",
				dynamicCreation: true,
			});
			const tigris = new Tigris(config);
			const dbPromise = tigris.getDatabase();
			const db = await dbPromise;
			expect(db.branch).toBe("fork_feature_1");
			return dbPromise;
		});

		it("throws error if non-templated branch does not exist", async () => {
			when(mockedUtil.branchNameFromEnv(anything())).thenReturn({
				name: "fork_feature_1",
				dynamicCreation: false,
			});
			const tigris = new Tigris(config);
			const dbPromise = tigris.getDatabase();
			return await expect(dbPromise).rejects.toThrow(DatabaseBranchError);
		});

		it("fails to create branch if project does not exist", async () => {
			when(mockedUtil.branchNameFromEnv(anything())).thenReturn({
				name: Branch.NotFound,
				dynamicCreation: true,
			});
			const tigris = new Tigris(config);
			const dbPromise = tigris.getDatabase();
			try {
				await dbPromise;
			} catch (error) {
				expect(error).toBeInstanceOf(Error);
				expect((error as ServiceError).code).toEqual(Status.NOT_FOUND);
			}

			return await expect(dbPromise).rejects.toThrow(Error);
		});

		it("initializer succeeds if branch already exists", async () => {
			when(mockedUtil.branchNameFromEnv(anything())).thenReturn({
				name: Branch.Existing,
				dynamicCreation: true,
			});
			const tigris = new Tigris(config);
			const dbPromise = tigris.getDatabase();
			const db = await dbPromise;
			expect(db.branch).toBe(Branch.Existing);
			return dbPromise;
		});
	});
});

@TigrisCollection("books")
export class IBook implements TigrisCollectionType {
	@PrimaryKey({ order: 1 })
	id: number;
	@Field()
	title: string;
	@Field()
	author: string;
	@Field({ elements: TigrisDataTypes.STRING })
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

export interface IBookMPK extends TigrisCollectionType {
	id?: number;
	id2?: number;
	title: string;
	metadata: object;
}
