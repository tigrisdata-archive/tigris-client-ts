import {
	FacetCount as ProtoFacetCount,
	FacetStats as ProtoFacetStats,
	Page as ProtoSearchPage,
	SearchFacet as ProtoSearchFacet,
	SearchHit as ProtoSearchHit,
	SearchHitMeta as ProtoSearchHitMeta,
	SearchMetadata as ProtoSearchMetadata,
	SearchResponse as ProtoSearchResponse,
	Match as ProtoMatch,
} from "../proto/server/v1/api_pb";
import { SearchIndexResponse as ProtoSearchIndexResponse } from "../proto/server/v1/search_pb";
import { TigrisClientConfig } from "../tigris";
import { TigrisCollectionType } from "../types";
import { Utility } from "../utility";

export type Facets = { [key: string]: FacetCountDistribution };

/**
 * Outcome of executing search query
 * @typeParam T - type of Tigris collection
 */
export class SearchResult<T> {
	/**
	 * Array of matched documents
	 * @readonly
	 */
	readonly hits: ReadonlyArray<IndexedDoc<T>>;
	/**
	 * Distribution of facets for fields included in facet query
	 * @readonly
	 */
	readonly facets: Facets;
	/**
	 * Metadata associated with {@link SearchResult}
	 * @readonly
	 * @defaultValue undefined
	 */
	readonly meta: SearchMeta | undefined;

	constructor(hits: Array<IndexedDoc<T>>, facets: Facets, meta: SearchMeta | undefined) {
		this.hits = hits;
		this.facets = facets;
		this.meta = meta;
	}

	static get empty(): SearchResult<never> {
		return new SearchResult([], {}, SearchMeta.default);
	}

	static from<T>(
		resp: ProtoSearchResponse | ProtoSearchIndexResponse,
		config: TigrisClientConfig
	): SearchResult<T> {
		const _meta =
			typeof resp?.getMeta() !== "undefined" ? SearchMeta.from(resp.getMeta()) : SearchMeta.default;
		const _hits: Array<IndexedDoc<T>> = resp
			.getHitsList()
			.map((h: ProtoSearchHit) => IndexedDoc.from<T>(h, config));
		const _facets: Facets = {};
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		for (const [k, _] of resp.getFacetsMap().toArray()) {
			_facets[k] = FacetCountDistribution.from(resp.getFacetsMap().get(k));
		}
		return new SearchResult(_hits, _facets, _meta);
	}
}

/**
 * Matched document and relevance metadata for a search query
 * @typeParam T - type of Tigris collection
 */
export class IndexedDoc<T extends TigrisCollectionType> {
	/**
	 * Deserialized collection/search index document
	 * @readonly
	 */
	readonly document: T | undefined;
	/**
	 * Relevance metadata for the matched document
	 * @readonly
	 */
	readonly meta: DocMeta | undefined;

	constructor(document: T, meta: DocMeta | undefined) {
		this.document = document;
		this.meta = meta;
	}

	static from<T>(resp: ProtoSearchHit, config: TigrisClientConfig): IndexedDoc<T> {
		const docAsB64 = resp.getData_asB64();
		if (!docAsB64) {
			return new IndexedDoc<T>(undefined, undefined);
		}
		const document = Utility.jsonStringToObj<T>(Utility._base64Decode(docAsB64), config);
		const meta = resp.hasMetadata() ? DocMeta.from(resp.getMetadata()) : undefined;
		return new IndexedDoc<T>(document, meta);
	}
}

/**
 * Relevance metadata for a matched document
 */
export class DocMeta {
	/**
	 * Time at which document was inserted/replaced to a precision of milliseconds
	 * @readonly
	 */
	readonly createdAt: Date | undefined;
	/**
	 * Time at which document was updated to a precision of milliseconds
	 * @readonly
	 */
	readonly updatedAt: Date | undefined;
	/**
	 * Metadata for matched fields and relevant score
	 * @readonly
	 */
	readonly textMatch: TextMatchInfo | undefined;

	constructor(createdAt: Date, updatedAt: Date, textMatch: TextMatchInfo) {
		this.createdAt = createdAt;
		this.updatedAt = updatedAt;
		this.textMatch = textMatch;
	}

	static from(resp: ProtoSearchHitMeta): DocMeta {
		const _createdAt =
			typeof resp?.getCreatedAt()?.getSeconds() !== "undefined"
				? new Date(resp.getCreatedAt().getSeconds() * 1000)
				: undefined;
		const _updatedAt =
			typeof resp?.getUpdatedAt()?.getSeconds() !== "undefined"
				? new Date(resp.getUpdatedAt().getSeconds() * 1000)
				: undefined;
		const _textMatch =
			typeof resp?.getMatch() !== "undefined" ? TextMatchInfo.from(resp.getMatch()) : undefined;

		return new DocMeta(_createdAt, _updatedAt, _textMatch);
	}
}

/**
 * Information about the matched document
 */
export class TextMatchInfo {
	readonly fields: ReadonlyArray<string>;
	readonly score: string;

	constructor(fields: ReadonlyArray<string>, score: string) {
		this.fields = fields;
		this.score = score;
	}

	static from(resp: ProtoMatch): TextMatchInfo {
		const matchFields: Array<string> = resp.getFieldsList().map((f) => f.getName());
		return new TextMatchInfo(matchFields, resp.getScore());
	}
}

/**
 * Distribution of values in a faceted field
 */
class FacetCountDistribution {
	/**
	 * List of field values and their aggregated counts
	 * @readonly
	 */
	readonly counts: ReadonlyArray<FacetCount>;

	/**
	 * Summary of faceted field
	 * @readonly
	 */
	readonly stats: FacetStats | undefined;

	constructor(counts: ReadonlyArray<FacetCount>, stats: FacetStats | undefined) {
		this.counts = counts;
		this.stats = stats;
	}

	static from(resp: ProtoSearchFacet): FacetCountDistribution {
		const stats =
			typeof resp?.getStats() !== "undefined" ? FacetStats.from(resp.getStats()) : undefined;
		const counts = resp.getCountsList().map((c) => FacetCount.from(c));
		return new FacetCountDistribution(counts, stats);
	}
}

/**
 * Aggregate count of values in a faceted field
 */
export class FacetCount {
	/**
	 * Field's attribute value
	 * @readonly
	 */
	readonly value: string;
	/**
	 * Count of field values in the search results
	 * @readonly
	 */
	readonly count: number;

	constructor(value: string, count: number) {
		this.value = value;
		this.count = count;
	}

	static from(resp: ProtoFacetCount): FacetCount {
		return new FacetCount(resp.getValue(), resp.getCount());
	}
}

/**
 * Summary of field values in a faceted field
 */
export class FacetStats {
	/**
	 * Only for numeric fields. Average of values in a numeric field
	 *
	 * @defaultValue `0`
	 * @readonly
	 */
	readonly avg: number;

	/**
	 * Count of values in a faceted field
	 * @readonly
	 */
	readonly count: number;

	/**
	 * Only for numeric fields. Maximum value in a numeric field.
	 *
	 * @defaultValue `0`
	 * @readonly
	 */
	readonly max: number;

	/**
	 * Only for numeric fields. Minimum value in a numeric field.
	 *
	 * @defaultValue `0`
	 * @readonly
	 */
	readonly min: number;

	/**
	 * Only for numeric fields. Sum of numeric values in the field.
	 *
	 * @defaultValue `0`
	 * @readonly
	 */
	readonly sum: number;

	constructor(avg: number, count: number, max: number, min: number, sum: number) {
		this.avg = avg;
		this.count = count;
		this.max = max;
		this.min = min;
		this.sum = sum;
	}

	static from(resp: ProtoFacetStats): FacetStats {
		return new FacetStats(
			resp?.getAvg() ?? 0,
			resp?.getCount() ?? 0,
			resp?.getMax() ?? 0,
			resp?.getMin() ?? 0,
			resp?.getSum() ?? 0
		);
	}
}

/**
 * Metadata associated with search results
 */
export class SearchMeta {
	/**
	 * Total number of matched hits for search query
	 * @readonly
	 */
	readonly found: number;

	/**
	 * Total number of pages of search results
	 * @readonly
	 */
	readonly totalPages: number;

	/**
	 * Current page information
	 * @readonly
	 */
	readonly page: Page;

	/**
	 * List of document fields matching the given input
	 * @readonly
	 */
	readonly matchedFields: ReadonlyArray<string>;

	constructor(found: number, totalPages: number, page: Page, matchedFields: Array<string>) {
		this.found = found;
		this.totalPages = totalPages;
		this.page = page;
		this.matchedFields = matchedFields;
	}

	static from(resp: ProtoSearchMetadata): SearchMeta {
		const found = resp?.getFound() ?? 0;
		const totalPages = resp?.getTotalPages() ?? 0;
		const page = typeof resp?.getPage() !== "undefined" ? Page.from(resp.getPage()) : undefined;
		return new SearchMeta(found, totalPages, page, resp.getMatchedFieldsList());
	}

	/**
	 * @returns default metadata to construct empty/default response
	 * @readonly
	 */
	static get default(): SearchMeta {
		return new SearchMeta(0, 1, Page.default, []);
	}
}

/**
 * Pagination metadata associated with search results
 */
export class Page {
	/**
	 * Current page number for the paginated search results
	 * @readonly
	 */
	readonly current;

	/**
	 * Maximum number of search results included per page
	 * @readonly
	 */
	readonly size;

	constructor(current, size) {
		this.current = current;
		this.size = size;
	}

	static from(resp: ProtoSearchPage): Page {
		const current = resp?.getCurrent() ?? 0;
		const size = resp?.getSize() ?? 0;
		return new Page(current, size);
	}

	/**
	 * @returns the pre-defined page number and size to construct a default response
	 * @readonly
	 */
	static get default(): Page {
		return new Page(1, 20);
	}
}
