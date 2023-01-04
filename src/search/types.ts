import { Filter, TigrisCollectionType } from "../types";
import {
	FacetCount as ProtoFacetCount,
	FacetStats as ProtoFacetStats,
	Page as ProtoSearchPage,
	SearchFacet as ProtoSearchFacet,
	SearchHit as ProtoSearchHit,
	SearchHitMeta as ProtoSearchHitMeta,
	SearchMetadata as ProtoSearchMetadata,
	SearchResponse as ProtoSearchResponse,
} from "../proto/server/v1/api_pb";
import { Utility } from "../utility";
import { TigrisClientConfig } from "../tigris";

export const MATCH_ALL_QUERY_STRING = "";

/**
 * Search request params
 */
export type SearchRequest<T extends TigrisCollectionType> = {
	/**
	 * Text to query
	 */
	q: string;
	/**
	 * Fields to project search query on
	 */
	searchFields?: Array<string>;
	/**
	 * Filter to further refine the search results
	 */
	filter?: Filter<T>;
	/**
	 * Facet fields to categorically arrange indexed terms
	 */
	facets?: FacetFieldsQuery;
	/**
	 * Sort the search results in indicated order
	 */
	sort?: Ordering;
	/**
	 * Document fields to include when returning search results
	 */
	includeFields?: Array<string>;
	/**
	 * Document fields to exclude when returning search results
	 */
	excludeFields?: Array<string>;
	/**
	 * Maximum number of search hits (matched documents) to fetch per page
	 */
	hitsPerPage?: number;
};

/**
 * Options for search request
 */
export type SearchRequestOptions = {
	/**
	 * Allows case-insensitive filtering
	 */
	collation?: Collation;
};

export type FacetFieldsQuery = FacetFieldOptions | FacetFields;

/**
 * Map of collection field names and faceting options to include facet results in search response
 */
export type FacetFieldOptions = {
	[key: string]: FacetQueryOptions;
};

/**
 * Array of field names to include facet results for in search response
 */
export type FacetFields = Array<string>;

/**
 * Information to build facets in search results
 * Use `Utility.createFacetQueryOptions()` to generate using defaults
 *
 * @see {@link Utility.createFacetQueryOptions}
 */
export type FacetQueryOptions = {
	/**
	 * Maximum number of facets to include in results
	 */
	size: number;
	/**
	 * Type of facets to build
	 */
	type: FacetQueryFieldType;
};

export enum FacetQueryFieldType {
	VALUE = "value",
}

/**
 * List of fields and their corresponding sort orders to order the search results.
 */
export type Ordering = Array<SortField>;

/**
 * Collection field name and sort order
 */
export type SortField = {
	field: string;
	order: SortOrder;
};

export enum SortOrder {
	/**
	 * Ascending order
	 */
	ASC = "$asc",

	/**
	 * Descending order
	 */
	DESC = "$desc",
}

export enum Case {
	/**
	 * Case insensitive collation case
	 */
	CaseInsensitive = "ci",
}

/**
 * A collation allows you to specify string comparison rules. Default is case-sensitive.
 */
export type Collation = {
	case: Case;
};

/**
 * Outcome of executing search query
 * @typeParam T - type of Tigris collection
 */
export class SearchResult<T> {
	private readonly _hits: ReadonlyArray<Hit<T>>;
	private readonly _facets: ReadonlyMap<string, FacetCountDistribution>;
	private readonly _meta: SearchMeta | undefined;

	constructor(
		hits: Array<Hit<T>>,
		facets: Map<string, FacetCountDistribution>,
		meta: SearchMeta | undefined
	) {
		this._hits = hits;
		this._facets = facets;
		this._meta = meta;
	}

	static get empty(): SearchResult<never> {
		return new SearchResult([], new Map(), SearchMeta.default);
	}

	/**
	 * @returns matched documents as a list
	 * @readonly
	 */
	get hits(): ReadonlyArray<Hit<T>> {
		return this._hits;
	}

	/**
	 * @returns distribution of facets for fields included in facet query
	 * @readonly
	 */
	get facets(): ReadonlyMap<string, FacetCountDistribution> {
		return this._facets;
	}

	/**
	 * @returns metadata associated with {@link SearchResult}
	 * @readonly
	 * @defaultValue undefined
	 */
	get meta(): SearchMeta | undefined {
		return this._meta;
	}

	static from<T>(resp: ProtoSearchResponse, config: TigrisClientConfig): SearchResult<T> {
		const _meta =
			typeof resp?.getMeta() !== "undefined" ? SearchMeta.from(resp.getMeta()) : SearchMeta.default;
		const _hits: Array<Hit<T>> = resp.getHitsList().map((h) => Hit.from(h, config));
		const _facets: Map<string, FacetCountDistribution> = new Map(
			resp
				.getFacetsMap()
				.toArray()
				.map(
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					([k, _]) => [k, FacetCountDistribution.from(resp.getFacetsMap().get(k))]
				)
		);
		return new SearchResult(_hits, _facets, _meta);
	}
}

/**
 * Matched document and relevance metadata for a search query
 * @typeParam T - type of Tigris collection
 */
export class Hit<T extends TigrisCollectionType> {
	private readonly _document: T;
	private readonly _meta: HitMeta | undefined;

	constructor(document: T, meta: HitMeta | undefined) {
		this._document = document;
		this._meta = meta;
	}

	/**
	 * @returns json deserialized collection document
	 * @readonly
	 */
	get document(): T {
		return this._document;
	}

	/**
	 * @returns relevance metadata for the matched document
	 * @readonly
	 */
	get meta(): HitMeta | undefined {
		return this._meta;
	}

	static from<T>(resp: ProtoSearchHit, config: TigrisClientConfig): Hit<T> {
		const document = Utility.jsonStringToObj<T>(
			Utility._base64Decode(resp.getData_asB64()),
			config
		);
		const meta = resp.hasMetadata() ? HitMeta.from(resp.getMetadata()) : undefined;
		return new Hit<T>(document, meta);
	}
}

/**
 * Relevance metadata for a matched document
 */
export class HitMeta {
	private readonly _createdAt: Date | undefined;
	private readonly _updatedAt: Date | undefined;

	constructor(createdAt: Date | undefined, updatedAt: Date | undefined) {
		this._createdAt = createdAt;
		this._updatedAt = updatedAt;
	}

	/**
	 * @returns time at which document was inserted/replaced to a precision of milliseconds
	 * @readonly
	 */
	get createdAt(): Date | undefined {
		return this._createdAt;
	}

	/**
	 * @returns time at which document was updated to a precision of milliseconds
	 * @readonly
	 */
	get updatedAt(): Date | undefined {
		return this._updatedAt;
	}

	static from(resp: ProtoSearchHitMeta): HitMeta {
		const _createdAt =
			typeof resp?.getCreatedAt()?.getSeconds() !== "undefined"
				? new Date(resp.getCreatedAt().getSeconds() * 1000)
				: undefined;
		const _updatedAt =
			typeof resp?.getUpdatedAt()?.getSeconds() !== "undefined"
				? new Date(resp.getUpdatedAt().getSeconds() * 1000)
				: undefined;

		return new HitMeta(_createdAt, _updatedAt);
	}
}

/**
 * Distribution of values in a faceted field
 */
export class FacetCountDistribution {
	private readonly _counts: ReadonlyArray<FacetCount>;
	private readonly _stats: FacetStats | undefined;

	constructor(counts: ReadonlyArray<FacetCount>, stats: FacetStats | undefined) {
		this._counts = counts;
		this._stats = stats;
	}

	/**
	 * @returns list of field values and their aggregated counts
	 * @readonly
	 */
	get counts(): ReadonlyArray<FacetCount> {
		return this._counts;
	}

	/**
	 * @returns summary of faceted field
	 * @readonly
	 */
	get stats(): FacetStats | undefined {
		return this._stats;
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
	private readonly _value: string;
	private readonly _count: number;

	constructor(value: string, count: number) {
		this._value = value;
		this._count = count;
	}

	/**
	 * @returns field's attribute value
	 * @readonly
	 */
	get value(): string {
		return this._value;
	}

	/**
	 * @returns count of field values in the search results
	 * @readonly
	 */
	get count(): number {
		return this._count;
	}

	static from(resp: ProtoFacetCount): FacetCount {
		return new FacetCount(resp.getValue(), resp.getCount());
	}
}

/**
 * Summary of field values in a faceted field
 */
export class FacetStats {
	private readonly _avg: number;
	private readonly _count: number;
	private readonly _max: number;
	private readonly _min: number;
	private readonly _sum: number;

	constructor(avg: number, count: number, max: number, min: number, sum: number) {
		this._avg = avg;
		this._count = count;
		this._max = max;
		this._min = min;
		this._sum = sum;
	}

	/**
	 * Only for numeric fields. Average of values in a numeric field
	 *
	 * @returns average of values in a numeric field
	 * @defaultValue `0`
	 * @readonly
	 */
	get avg(): number {
		return this._avg;
	}

	/**
	 * @returns Count of values in a faceted field
	 * @readonly
	 */
	get count(): number {
		return this._count;
	}

	/**
	 * Only for numeric fields. Maximum value in a numeric field
	 *
	 * @returns maximum value in a numeric field
	 * @defaultValue `0`
	 * @readonly
	 */
	get max(): number {
		return this._max;
	}

	/**
	 * Only for numeric fields. Minimum value in a numeric field
	 *
	 * @returns minimum value in a numeric field
	 * @defaultValue `0`
	 * @readonly
	 */
	get min(): number {
		return this._min;
	}

	/**
	 * Only for numeric fields. Sum of numeric values in the field
	 *
	 * @returns sum of numeric values in the field
	 * @defaultValue `0`
	 * @readonly
	 */
	get sum(): number {
		return this._sum;
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
	private readonly _found: number;
	private readonly _totalPages: number;
	private readonly _page: Page;

	constructor(found: number, totalPages: number, page: Page) {
		this._found = found;
		this._totalPages = totalPages;
		this._page = page;
	}

	/**
	 * @returns total number of matched hits for search query
	 * @readonly
	 */
	get found(): number {
		return this._found;
	}

	/**
	 * @returns total number of pages of search results
	 * @readonly
	 */
	get totalPages(): number {
		return this._totalPages;
	}

	/**
	 * @returns current page information
	 * @readonly
	 */
	get page(): Page {
		return this._page;
	}

	static from(resp: ProtoSearchMetadata): SearchMeta {
		const found = resp?.getFound() ?? 0;
		const totalPages = resp?.getTotalPages() ?? 0;
		const page = typeof resp?.getPage() !== "undefined" ? Page.from(resp.getPage()) : undefined;
		return new SearchMeta(found, totalPages, page);
	}

	/**
	 * @returns default metadata to construct empty/default response
	 * @readonly
	 */
	static get default(): SearchMeta {
		return new SearchMeta(0, 1, Page.default);
	}
}

/**
 * Pagination metadata associated with search results
 */
export class Page {
	private readonly _current;
	private readonly _size;

	constructor(current, size) {
		this._current = current;
		this._size = size;
	}

	/**
	 * @returns current page number for the paginated search results
	 * @readonly
	 */
	get current() {
		return this._current;
	}

	/**
	 * @returns maximum number of search results included per page
	 * @readonly
	 */
	get size() {
		return this._size;
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
