import {
	FacetCount as ProtoFacetCount,
	FacetStats as ProtoFacetStats,
	Page as ProtoPage,
	SearchFacet as ProtoSearchFacet,
	SearchHit as ProtoSearchHit,
	SearchHitMeta as ProtoSearchHitMeta,
	SearchMetadata as ProtoSearchMetadata,
	SearchResponse as ProtoSearchResponse,
	Match as ProtoMatch,
	MatchField as ProtoMatchField,
} from "../../proto/server/v1/api_pb";
import { TestTigrisService } from "../test-service";
import { IBook } from "../tigris.rpc.spec";
import * as google_protobuf_timestamp_pb from "google-protobuf/google/protobuf/timestamp_pb";
import { TextMatchInfo, SearchResult, DocMeta, SearchMeta } from "../../search";

describe("SearchResponse parsing", () => {
	it("generates search hits appropriately", () => {
		const expectedTimeInSeconds = Math.floor(Date.now() / 1000);
		const expectedHits: ProtoSearchHit[] = [...TestTigrisService.BOOKS_B64_BY_ID].map(
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			([_id, value]) =>
				new ProtoSearchHit()
					.setData(value)
					.setMetadata(
						new ProtoSearchHitMeta().setUpdatedAt(
							new google_protobuf_timestamp_pb.Timestamp().setSeconds(expectedTimeInSeconds)
						)
					)
		);
		const input: ProtoSearchResponse = new ProtoSearchResponse();
		input.setHitsList(expectedHits);
		const parsed: SearchResult<IBook> = SearchResult.from(input, {
			serverUrl: "test",
		});

		expect(parsed.hits).toHaveLength(expectedHits.length);
		const receivedIds: string[] = parsed.hits.map((h) => h.document.id.toString());
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		for (const [id] of TestTigrisService.BOOKS_B64_BY_ID) {
			expect(receivedIds).toContain(id);
		}
		for (const hit of parsed.hits) {
			expect(hit.meta.createdAt).toBeUndefined();
			const expectedDate: Date = new Date(expectedTimeInSeconds * 1000);
			expect(hit.meta.updatedAt).toStrictEqual(expectedDate);
		}
	});

	it("generates facets appropriately", () => {
		const input: ProtoSearchResponse = new ProtoSearchResponse();
		const searchFacet = new ProtoSearchFacet().setCountsList([
			new ProtoFacetCount().setCount(2).setValue("Marcel Proust"),
		]);
		input.getFacetsMap().set("author", searchFacet);
		const parsed: SearchResult<unknown> = SearchResult.from(input, { serverUrl: "test" });

		expect(Object.keys(parsed.facets).length).toBe(1);
		expect(parsed.facets["author"]).toBeDefined();

		const facetDistribution = parsed.facets["author"];
		expect(facetDistribution.counts).toHaveLength(1);
		expect(facetDistribution.counts[0].count).toBe(2);
		expect(facetDistribution.counts[0].value).toBe("Marcel Proust");

		expect(facetDistribution.stats).toBeUndefined();
	});

	it("generates default facet stats", () => {
		const input: ProtoSearchResponse = new ProtoSearchResponse();
		const searchFacet = new ProtoSearchFacet().setStats(new ProtoFacetStats().setAvg(4.5));
		input.getFacetsMap().set("author", searchFacet);
		const parsed: SearchResult<unknown> = SearchResult.from(input, { serverUrl: "test" });

		const facetDistribution = parsed.facets["author"];
		expect(facetDistribution.stats).toBeDefined();
		expect(facetDistribution.stats.avg).toBe(4.5);
		expect(facetDistribution.stats.min).toBe(0);
		expect(facetDistribution.stats.count).toBe(0);
		expect(facetDistribution.stats.max).toBe(0);
		expect(facetDistribution.stats.sum).toBe(0);
	});

	it("generates empty result with empty response", () => {
		const input: ProtoSearchResponse = new ProtoSearchResponse();
		const parsed: SearchResult<unknown> = SearchResult.from(input, { serverUrl: "test" });

		expect(parsed).toBeDefined();
		expect(parsed.hits).toBeDefined();
		expect(parsed.hits).toHaveLength(0);
		expect(parsed.facets).toBeDefined();
		expect(Object.keys(parsed.facets).length).toBe(0);
		expect(parsed.meta).toBeDefined();
		expect(parsed.meta.found).toBe(0);
		expect(parsed.meta.totalPages).toBe(1);
		expect(parsed.meta.page).toBeDefined();
		expect(parsed.meta.page.current).toBe(1);
		expect(parsed.meta.page.size).toBe(20);
	});

	it("generates meta appropriately with complete response", () => {
		const input: ProtoSearchResponse = new ProtoSearchResponse();
		const page: ProtoPage = new ProtoPage().setSize(3).setCurrent(2);
		input.setMeta(new ProtoSearchMetadata().setPage(page).setTotalPages(100));
		const parsed: SearchResult<unknown> = SearchResult.from(input, { serverUrl: "test" });

		expect(parsed.meta.page.size).toBe(3);
		expect(parsed.meta.page.current).toBe(2);
		expect(parsed.meta.totalPages).toBe(100);
	});

	describe("SearchMeta", () => {
		it("generates default SearchMeta with empty input", () => {
			const input: ProtoSearchMetadata = new ProtoSearchMetadata();
			const parsed = SearchMeta.from(input);
			expect(parsed.totalPages).toBe(0);
			expect(parsed.found).toBe(0);
			expect(parsed.page).toBeUndefined();
			expect(parsed.matchedFields).toEqual([]);
		});

		it("generates no page values with empty page", () => {
			const input = new ProtoSearchMetadata().setFound(5);
			const parsed = SearchMeta.from(input);

			expect(parsed.found).toBe(5);
			expect(parsed.totalPages).toBe(0);
			expect(parsed.page).toBeUndefined();
			expect(parsed.matchedFields).toEqual([]);
		});

		it("generates meta with complete input", () => {
			const page: ProtoPage = new ProtoPage().setSize(3).setCurrent(2);
			const input: ProtoSearchMetadata = new ProtoSearchMetadata()
				.setPage(page)
				.setTotalPages(100)
				.setMatchedFieldsList(["empId", "name"]);
			const parsed = SearchMeta.from(input);

			expect(parsed.page.size).toBe(3);
			expect(parsed.page.current).toBe(2);
			expect(parsed.totalPages).toBe(100);
			expect(parsed.matchedFields).toEqual(["empId", "name"]);
		});
	});

	describe("DocMeta", () => {
		it("generates DocMeta with empty", () => {
			const input: ProtoSearchHitMeta = new ProtoSearchHitMeta();
			const parsed: DocMeta = DocMeta.from(input);
			expect(parsed.createdAt).toBeUndefined();
			expect(parsed.updatedAt).toBeUndefined();
			expect(parsed.textMatch).toBeUndefined();
		});
		it("generates DocMeta with empty", () => {
			const input: ProtoSearchHitMeta = new ProtoSearchHitMeta();
			const expectedTimeInSeconds = Math.floor(Date.now() / 1000);
			input.setCreatedAt(
				new google_protobuf_timestamp_pb.Timestamp().setSeconds(expectedTimeInSeconds)
			);
			input.setMatch(new ProtoMatch());
			const parsed: DocMeta = DocMeta.from(input);
			expect(parsed.updatedAt).toBeUndefined();
			expect(parsed.createdAt).toStrictEqual(new Date(expectedTimeInSeconds * 1000));
			expect(parsed.textMatch).toBeDefined();
		});
	});

	describe("TextMatchInfo", () => {
		it("generates match field with empty inputs", () => {
			const input: ProtoMatch = new ProtoMatch();
			const parsed: TextMatchInfo = TextMatchInfo.from(input);
			expect(parsed.fields).toStrictEqual([]);
			expect(parsed.score).toBe("");
			expect(parsed.vectorDistance).toBeUndefined();
		});
		it("generates match field from input", () => {
			const input: ProtoMatch = new ProtoMatch();
			input.setScore("456");
			input.addFields(new ProtoMatchField().setName("person"));
			input.addFields(new ProtoMatchField().setName("user"));
			input.setVectorDistance(0.24);

			const parsed: TextMatchInfo = TextMatchInfo.from(input);
			expect(parsed.fields).toEqual(expect.arrayContaining(["person", "user"]));
			expect(parsed.score).toBe("456");
			expect(parsed.vectorDistance).toBe(0.24);
		});
	});
});
