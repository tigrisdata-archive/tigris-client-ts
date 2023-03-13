import { LogicalOperator, Order, SelectorFilterOperator, TigrisDataTypes } from "../types";
import { Tigris } from "../tigris";
import { Status } from "../constants";
import {
	IndexedDoc,
	MATCH_ALL_QUERY_STRING,
	SearchIndex,
	SearchIterator,
	SearchQuery,
	TigrisIndexSchema,
	TigrisIndexType,
} from "../search";
import { Server, ServerCredentials } from "@grpc/grpc-js";
import TestSearchService, { SearchServiceFixtures } from "./test-search-service";
import { SearchService } from "../proto/server/v1/search_grpc_pb";
import { Search } from "../search";
import { SearchField } from "../decorators/tigris-search-field";
import { TigrisSearchIndex } from "../decorators/tigris-search-index";

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
		it("creates index from decorated schema model", async () => {
			const createPromise = tigris.createOrUpdateIndex(BlogPost);
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
			const tigris = new Tigris({ serverUrl: "localhost:8081", projectName: "db1" }).getSearch();
			const index: SearchIndex<Book> = await tigris.getIndex(SearchServiceFixtures.Success);
			// const index: SearchIndex<Book> = await tigris.createOrUpdateIndex(
			// 	SearchServiceFixtures.Success,
			// 	bookSchema
			// );
			const result = await index.createMany(Array.from(docs.values()));
			console.log(result);
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
			const tigris = new Tigris({ serverUrl: "localhost:8081", projectName: "db1" }).getSearch();
			const index = await tigris.getIndex<Book>(SearchServiceFixtures.Success);
			const expectedDocs = Array.from(SearchServiceFixtures.Docs.values());
			const recvdDocs = await index.getMany([
				"23b0ee7b-cc75-49d6-b844-742ec9047678",
				"b3a44d36-3db1-46a0-af20-27505689d402",
			]);
			console.log(JSON.stringify(recvdDocs));
			for (let i = 0; i < recvdDocs.length; i++) {
				expect(recvdDocs[i].meta.updatedAt).toBeUndefined();
				expect(recvdDocs[i].meta.createdAt).toStrictEqual(
					new Date(SearchServiceFixtures.GetDocs.CreatedAtSeconds * 1000)
				);
				expect(recvdDocs[i].document).toEqual(expectedDocs[i]);
			}
		});

		it("gets a single document", async () => {
			const index = await tigris.getIndex<Book>(SearchServiceFixtures.Success);
			const result = await index.getOne("1");
			expect(result.document).toEqual(SearchServiceFixtures.Docs.get("1"));
			expect(result.meta.updatedAt).toBeUndefined();
			expect(result.meta.createdAt).toStrictEqual(
				new Date(SearchServiceFixtures.GetDocs.CreatedAtSeconds * 1000)
			);
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
				searchResult.hits.forEach((h: IndexedDoc<Book>) => {
					expect(expectedDocs).toContainEqual(h.document);
					expect(h.meta.updatedAt).toBeDefined();
					expect(h.meta.updatedAt).toStrictEqual(
						new Date(SearchServiceFixtures.SearchDocs.UpdatedAtSeconds * 1000)
					);
					expect(h.meta.createdAt).toBeUndefined();
				});
				expect(searchResult.meta.found).toBe(5);
				expect(searchResult.meta.totalPages).toBe(5);
				expect(searchResult.facets["title"]).toBeDefined();
				expect(searchResult.facets["title"].counts).toEqual([
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

describe("for the project", () => {
	let catalog: SearchIndex<Catalog>;
	const docs: Array<Catalog> = [
		{
			id: "1",
			name: "fiona handbag",
			price: 99.9,
			brand: "michael kors",
			labels: "purses",
			popularity: 8,
			review: {
				author: "alice",
				rating: 7,
			},
		},
		{
			id: "2",
			name: "tote bag",
			price: 49,
			brand: "coach",
			labels: "handbags",
			popularity: 9,
			review: {
				author: "olivia",
				rating: 8.3,
			},
		},
		{
			id: "3",
			name: "sling bag",
			price: 75,
			brand: "coach",
			labels: "purses",
			popularity: 9,
			review: {
				author: "alice",
				rating: 9.2,
			},
		},
		{
			id: "4",
			name: "sneakers shoes",
			price: 40,
			brand: "adidas",
			labels: "shoes",
			popularity: 10,
			review: {
				author: "olivia",
				rating: 9,
			},
		},
		{
			id: "5",
			name: "running shoes",
			price: 89,
			brand: "nike",
			labels: "shoes",
			popularity: 10,
			review: {
				author: "olivia",
				rating: 8.5,
			},
		},
		{
			id: "6",
			name: "running shorts",
			price: 35,
			brand: "adidas",
			labels: "clothing",
			popularity: 7,
			review: {
				author: "olivia",
				rating: 7.5,
			},
		},
	];

	beforeAll(async () => {
		const tigris = new Tigris({ serverUrl: "localhost:8081", projectName: "db1" }).getSearch();
		await tigris.deleteIndex("catalog");
		catalog = await tigris.createOrUpdateIndex(Catalog);
	});

	it("searches", async () => {
		const inserted = await catalog.createMany(docs);
		console.table(docs);
		const query: SearchQuery<Catalog> = {
			q: "running",
			searchFields: ["name", "labels"],
			sort: [
				{
					field: "popularity",
					order: Order.DESC,
				},
				{
					field: "review.rating",
					order: Order.DESC,
				},
			],
		};
		const result = await catalog.search(query, 1);
		console.log(result.toString());
	});
});

interface Book extends TigrisIndexType {
	title: string;
	tags?: string[];
}

const bookSchema: TigrisIndexSchema<Book> = {
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

@TigrisSearchIndex(SearchServiceFixtures.CreateIndex.Blog)
class BlogPost {
	@SearchField({ facet: true })
	text: string;

	@SearchField({ elements: TigrisDataTypes.STRING })
	comments: Array<string>;

	@SearchField()
	author: string;

	@SearchField({ sort: true })
	createdAt: Date;
}

class Review {
	@SearchField()
	author: string;
	@SearchField()
	rating: number;
}
@TigrisSearchIndex("catalog")
class Catalog {
	@SearchField()
	id: string;

	@SearchField()
	name: string;
	@SearchField()
	price: number;
	@SearchField({ facet: true })
	brand: string;
	@SearchField({ facet: true })
	labels: string;
	@SearchField()
	popularity: number;
	@SearchField()
	review: Review;
}
