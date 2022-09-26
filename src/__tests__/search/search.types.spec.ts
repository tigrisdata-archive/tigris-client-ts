import {
	FacetCount as ProtoFacetCount,
	FacetStats as ProtoFacetStats,
	Page as ProtoPage,
	SearchFacet as ProtoSearchFacet,
	SearchHit as ProtoSearchHit,
	SearchHitMeta as ProtoSearchHitMeta,
	SearchMetadata as ProtoSearchMetadata,
	SearchResponse as ProtoSearchResponse,
} from "../../proto/server/v1/api_pb";
import {SearchResult} from "../../search/types";
import {TestTigrisService} from "../test-service";
import {IBook} from "../tigris.rpc.spec";
import * as google_protobuf_timestamp_pb from "google-protobuf/google/protobuf/timestamp_pb";

describe("SearchResponse parsing", () => {
	it("generates search hits appropriately", () => {
		const expectedTimeInSeconds = Math.floor(Date.now()/1000);
		const expectedHits:  ProtoSearchHit[] = [...TestTigrisService.BOOKS_B64_BY_ID].map(
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			([_id, value]) => new ProtoSearchHit()
				.setData(value)
				.setMetadata(new ProtoSearchHitMeta().setUpdatedAt(
					new google_protobuf_timestamp_pb.Timestamp().setSeconds(expectedTimeInSeconds)
				))
		);
		const input: ProtoSearchResponse = new ProtoSearchResponse();
		input.setHitsList(expectedHits);
		const parsed: SearchResult<IBook> = SearchResult.from(input, {
			serverUrl: "test"
		});

		expect(parsed.hits).toHaveLength(expectedHits.length);
		const receivedIds: string[] = parsed.hits.map(h => h.document.id.toString());
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		for (const [id] of TestTigrisService.BOOKS_B64_BY_ID)  {
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
		const searchFacet = new ProtoSearchFacet().setCountsList(
			[new ProtoFacetCount().setCount(2).setValue("Marcel Proust")]);
		input.getFacetsMap().set("author", searchFacet);
		const parsed: SearchResult<unknown> = SearchResult.from(input, {serverUrl: "test"});

		expect(parsed.facets.size).toBe(1);
		expect(parsed.facets.get("author")).toBeDefined();

		const facetDistribution = parsed.facets.get("author");
		expect(facetDistribution.counts).toHaveLength(1);
		expect(facetDistribution.counts[0].count).toBe(2);
		expect(facetDistribution.counts[0].value).toBe("Marcel Proust");

		expect(facetDistribution.stats).toBeUndefined();
	});

	it("generates default facet stats", () => {
		const input: ProtoSearchResponse = new ProtoSearchResponse();
		const searchFacet = new ProtoSearchFacet().setStats(new ProtoFacetStats().setAvg(4.5));
		input.getFacetsMap().set("author", searchFacet);
		const parsed: SearchResult<unknown> = SearchResult.from(input, {serverUrl: "test"});

		const facetDistribution = parsed.facets.get("author");
		expect(facetDistribution.stats).toBeDefined();
		expect(facetDistribution.stats.avg).toBe(4.5);
		expect(facetDistribution.stats.min).toBe(0);
		expect(facetDistribution.stats.count).toBe(0);
		expect(facetDistribution.stats.max).toBe(0);
		expect(facetDistribution.stats.sum).toBe(0);
	});

	it("generates empty result with empty response", () => {
		const input: ProtoSearchResponse = new ProtoSearchResponse();
		const parsed: SearchResult<unknown> = SearchResult.from(input, {serverUrl: "test"});

		expect(parsed).toBeDefined();
		expect(parsed.hits).toBeDefined();
		expect(parsed.hits).toHaveLength(0);
		expect(parsed.facets).toBeDefined();
		expect(parsed.facets.size).toBe(0);
		expect(parsed.meta).toBeUndefined();
	});

	it("generates default meta values with empty meta", () => {
		const input: ProtoSearchResponse = new ProtoSearchResponse();
		input.setMeta(new ProtoSearchMetadata());
		const parsed: SearchResult<unknown> = SearchResult.from(input, {serverUrl: "test"});

		expect(parsed.meta).toBeDefined();
		expect(parsed.meta.found).toBe(0);
		expect(parsed.meta.totalPages).toBe(0);
		expect(parsed.meta.page).toBeUndefined();
	});

	it("generates no page values with empty page", () => {
		const input: ProtoSearchResponse = new ProtoSearchResponse();
		input.setMeta(new ProtoSearchMetadata().setFound(5));
		const parsed: SearchResult<unknown> = SearchResult.from(input, {serverUrl: "test"});

		expect(parsed.meta.found).toBe(5);
		expect(parsed.meta.totalPages).toBe(0);
		expect(parsed.meta.page).toBeUndefined();
	});

	it ("generates meta appropriately with complete response", () => {
		const input: ProtoSearchResponse = new ProtoSearchResponse();
		const page: ProtoPage = new ProtoPage().setSize(3).setCurrent(2);
		input.setMeta(new ProtoSearchMetadata().setPage(page).setTotalPages(100));
		const parsed: SearchResult<unknown> = SearchResult.from(input, {serverUrl: "test"});

		expect(parsed.meta.page.size).toBe(3);
		expect(parsed.meta.page.current).toBe(2);
		expect(parsed.meta.totalPages).toBe(100);
	});

});
