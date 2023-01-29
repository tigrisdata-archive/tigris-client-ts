import { TigrisDataTypes } from "../types";
import { Tigris } from "../tigris";
import { Status } from "../constants";
import { TigrisIndex, TigrisIndexType } from "../search";
import { Server, ServerCredentials } from "@grpc/grpc-js";
import TestSearchService, { SearchServiceFixtures } from "./test-search-service";
import { SearchService } from "../proto/server/v1/search_grpc_pb";
import { SearchIndex } from "../search";
import { MATCH_ALL_QUERY_STRING } from "../search";
import { SearchIterator } from "../search";
import { Hit } from "../search";
import { Search } from "../search/search";

describe("Search Indexing", () => {
	let tigris: Search;
	let server: Server;
	beforeAll((done) => {
		const testConfig = { serverUrl: "localhost:" + 5004, projectName: "db1", branch: "unit-tests" };
		server = new Server();
		server.addService(SearchService, TestSearchService.handler.impl);
		server.bindAsync(
			testConfig.serverUrl,
			ServerCredentials.createInsecure(),
			(err: Error | null) => {
				if (err) {
					console.log(err);
				} else {
					server.start();
				}
			}
		);
		tigris = new Tigris(testConfig).getSearch();
		done();
	});

	afterAll((done) => {
		server.forceShutdown();
		done();
	});

	describe("createOrUpdateIndex", () => {
		it("creates index if not exists", async () => {
			const createPromise = tigris.createOrUpdateIndex(SearchServiceFixtures.Success, bookSchema);
			await expect(createPromise).resolves.toBeInstanceOf(SearchIndex);
		});
		it("fails when index already exists", async () => {
			const createPromise = tigris.createOrUpdateIndex(
				SearchServiceFixtures.AlreadyExists,
				bookSchema
			);
			await expect(createPromise).rejects.toThrow("already exists");
		});
		it("fails for server error", async () => {
			const createPromise = tigris.createOrUpdateIndex("any other index", bookSchema);
			await expect(createPromise).rejects.toThrow("Server error");
		});
	});

	describe("getIndex", () => {
		it("succeeds if index exists", async () => {
			const getIndexPromise = tigris.getIndex(SearchServiceFixtures.Success);
			return expect(getIndexPromise).resolves.toBeInstanceOf(SearchIndex);
		});
		it("fails if index does not exist", async () => {
			await expect(tigris.getIndex(SearchServiceFixtures.DoesNotExist)).rejects.toThrow(
				"search index not found"
			);
		});
	});

	describe("deleteIndex", () => {
		it("succeeds if index exists", async () => {
			const deleteResp = await tigris.deleteIndex(SearchServiceFixtures.Success);
			expect(deleteResp.status).toBe(Status.Deleted);
		});

		it("fails if index does not exist", async () => {
			await expect(tigris.deleteIndex(SearchServiceFixtures.DoesNotExist)).rejects.toThrow(
				"search index not found"
			);
		});
	});

	it("listIndexes", async () => {
		const names = (await tigris.listIndexes()).map((idx) => idx.name);
		return expect(names).toEqual(expect.arrayContaining(["i1", "i2"]));
	});

	describe("createDocuments", () => {
		const docs: Map<string, Book> = new Map([
			["italy", { title: "italy", tags: ["travel"] }],
			["reliable systems", { title: "reliable systems", tags: ["it"] }],
		]);

		it("successfully creates multiple documents", async () => {
			expect.assertions(docs.size);
			const index: SearchIndex<Book> = await tigris.getIndex(SearchServiceFixtures.Success);
			const result = await index.createMany(Array.from(docs.values()));
			result.forEach((r) => expect(docs.has(r.id)).toBeTruthy());
		});

		it("creates a single document", async () => {
			const index: SearchIndex<Book> = await tigris.getIndex(SearchServiceFixtures.Success);
			const result = await index.createOne(docs.get("italy"));
			expect(result.id).toEqual("italy");
		});
	});

	describe("deleteDocuments", () => {
		it("deletes a single document", async () => {
			const index = await tigris.getIndex(SearchServiceFixtures.Success);
			const result = await index.deleteOne("12345");
			expect(result.id).toBe("12345");
		});

		it("deletes multiple documents", async () => {
			const index = await tigris.getIndex(SearchServiceFixtures.Success);
			const docIds = ["1", "2", "3"];
			expect.assertions(docIds.length);
			const result = await index.deleteMany(docIds);
			result.forEach((r) => expect(docIds).toContain(r.id));
		});
	});

	describe("getDocuments", () => {
		it("gets multiple documents", async () => {
			const index = await tigris.getIndex<Book>(SearchServiceFixtures.Success);
			const result = await index.getMany(Array.from(SearchServiceFixtures.Docs.keys()));
			expect(result).toEqual(
				expect.arrayContaining(Array.from(SearchServiceFixtures.Docs.values()))
			);
		});

		it("gets a single document", async () => {
			const index = await tigris.getIndex<Book>(SearchServiceFixtures.Success);
			const result = await index.getOne("1");
			expect(result).toEqual(SearchServiceFixtures.Docs.get("1"));
		});
	});

	describe("searchDocuments", () => {
		it("returns an iterator", async () => {
			const index = await tigris.getIndex<Book>(SearchServiceFixtures.Success);
			const maybeIterator = await index.search({ q: MATCH_ALL_QUERY_STRING });
			expect(maybeIterator).toBeInstanceOf(SearchIterator);
			const expectedDocs = Array.from(SearchServiceFixtures.Docs.values());
			// for await loop the iterator
			for await (const searchResult of maybeIterator) {
				searchResult.hits.forEach((h: Hit<Book>) => {
					expect(expectedDocs).toContainEqual(h.document);
					expect(h.meta.updatedAt).toBeDefined();
					expect(h.meta.createdAt).toBeUndefined();
				});
				expect(searchResult.meta.found).toBe(5);
				expect(searchResult.meta.totalPages).toBe(5);
				expect(searchResult.facets.get("title")).toBeDefined();
				expect(searchResult.facets.get("title").counts).toEqual([
					{
						_count: 2,
						_value: "Philosophy",
					},
				]);
			}
		});
	});

	it("returns a promise with page number", async () => {
		const index = await tigris.getIndex<Book>(SearchServiceFixtures.Success);
		const maybePromise = index.search({ q: MATCH_ALL_QUERY_STRING }, 1);
		expect(maybePromise).toBeInstanceOf(Promise);
		return expect(maybePromise).resolves.toBeDefined();
	});
});

interface Book extends TigrisIndexType {
	title: string;
	tags?: string[];
}

const bookSchema: TigrisIndex<Book> = {
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
