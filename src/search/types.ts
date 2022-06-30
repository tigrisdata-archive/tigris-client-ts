import {LogicalFilter, ReadFields, Selector, SelectorFilter, TigrisCollectionType} from "../types";
import {
	FacetCount as ProtoFacetCount,
	FacetStats as ProtoFacetStats,
	SearchFacet as ProtoSearchFacet,
	SearchHit as ProtoSearchHit,
	SearchHitMeta as ProtoSearchHitMeta,
	SearchMetadata as ProtoSearchMetadata,
	SearchResponse as ProtoSearchResponse,
} from "../proto/server/v1/api_pb";
import {Utility} from "../utility";

export const MATCH_ALL_QUERY_STRING = "";

export type SearchRequest<T extends TigrisCollectionType> = {
	q: string;
	searchFields?: string[],
	filter?: SelectorFilter<T> | LogicalFilter<T> | Selector<T>,
	facetQuery?: FacetFieldsQuery,
	sort?: SortOrder,
	readFields?: ReadFields;
};

export type SearchRequestOptions = {
	page: number;
	perPage: number;
};

export function createSearchRequestOptions(options?: Partial<SearchRequestOptions>): SearchRequestOptions {
	const defaults = {page: 1, perPage: 10};
	return {
		...defaults,
		...options
	};
}

export type FacetFieldsQuery = {
	[key: string]: FacetQueryOptions;
};

export type FacetQueryOptions = {
	size: number;
	type: FacetQueryFieldType;
};

export function createFacetQueryOptions(options?: Partial<FacetQueryOptions>): FacetQueryOptions {
	const defaults = {size: 1, type: FacetQueryFieldType.VALUE};
	return {...defaults, ...options};
}

export enum FacetQueryFieldType {
	VALUE = "value"
}

//TODO: implementation pending
export type SortOrder = "undefined";

export class SearchResult<T> {
	private readonly _hits: Hit<T>[];
	private readonly _facets: Map<string, FacetCountDistribution>;
	private readonly _meta: SearchMeta | undefined;

	constructor(hits: Hit<T>[], facets: Map<string, FacetCountDistribution>, meta: SearchMeta | undefined) {
		this._hits = hits;
		this._facets = facets;
		this._meta = meta;
	}

	get hits(): Hit<T>[] {
		return this._hits;
	}

	get facets(): Map<string, FacetCountDistribution> {
		return this._facets;
	}

	get meta(): SearchMeta | undefined {
		return this._meta;
	}

	static from<T>(resp: ProtoSearchResponse): SearchResult<T> {
		const _meta = typeof resp?.getMeta() !== "undefined" ? SearchMeta.from(resp.getMeta()) : undefined;
		const _hits: Hit<T>[] = resp.getHitsList().map(h => Hit.from(h));
		const _facets: Map<string, FacetCountDistribution> = new Map(
			resp.getFacetsMap().toArray().map(
				([k, _]) => [k, FacetCountDistribution.from(resp.getFacetsMap().get(k))]
			));
		return new SearchResult(_hits, _facets, _meta);
	}
}

export class Hit<T extends TigrisCollectionType> {
	private readonly _document: T;
	private readonly _meta: HitMeta | undefined;

	constructor(document: T, meta: HitMeta | undefined) {
		this._document = document;
		this._meta = meta;
	}

	get document(): T {
		return this._document;
	}

	get meta(): HitMeta | undefined {
		return this._meta;
	}

	static from<T>(resp: ProtoSearchHit): Hit<T> {
		const document = Utility.jsonStringToObj<T>(Utility._base64Decode(resp.getData_asB64()));
		const meta = resp.hasMetadata() ? HitMeta.from(resp.getMetadata()) : undefined;
		return new Hit<T>(document, meta);
	}
}

export class HitMeta {
	private readonly _createdAt: Date | undefined;
	private readonly _updatedAt: Date | undefined;

	constructor(createdAt: Date | undefined, updatedAt: Date | undefined) {
		this._createdAt = createdAt;
		this._updatedAt = updatedAt;
	}

	get createdAt(): Date | undefined {
		return this._createdAt;
	}

	get updatedAt(): Date | undefined {
		return this._updatedAt;
	}

	static from(resp: ProtoSearchHitMeta): HitMeta {
		const _createdAt = typeof resp?.getCreatedAt()?.getSeconds() !== "undefined" ? new Date(resp.getCreatedAt().getSeconds() * 1000) : undefined;
		const _updatedAt = typeof resp?.getUpdatedAt()?.getSeconds() !== "undefined" ? new Date(resp.getUpdatedAt().getSeconds() * 1000) : undefined;

		return new HitMeta(_createdAt, _updatedAt);
	}
}

export class FacetCountDistribution {
	private readonly _counts: readonly FacetCount[];
	private readonly _stats: FacetStats | undefined;

	constructor(counts: readonly FacetCount[], stats: FacetStats | undefined) {
		this._counts = counts;
		this._stats = stats;
	}

	get counts(): readonly FacetCount[] {
		return this._counts;
	}

	get stats(): FacetStats | undefined {
		return this._stats;
	}

	static from(resp: ProtoSearchFacet): FacetCountDistribution {
		const stats = typeof resp?.getStats() !== "undefined" ? FacetStats.from(resp.getStats()) : undefined;
		const counts = resp.getCountsList().map(c => FacetCount.from(c));
		return new FacetCountDistribution(counts, stats);
	}
}

export class FacetCount {
	private readonly _value: string;
	private readonly _count: number;

	constructor(value: string, count: number) {
		this._value = value;
		this._count = count;
	}

	get value(): string {
		return this._value;
	}

	get count(): number {
		return this._count;
	}

	static from(resp: ProtoFacetCount): FacetCount {
		return new FacetCount(resp.getValue(), resp.getCount());
	}
}

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

	get avg(): number {
		return this._avg;
	}

	get count(): number {
		return this._count;
	}

	get max(): number {
		return this._max;
	}

	get min(): number {
		return this._min;
	}

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

export class SearchMeta {
	private readonly _found: number;
	private readonly _currentPage: number;
	private readonly _perPage: number;
	private readonly _totalPages: number;

	constructor(found: number, currentPage: number, perPage: number, totalPages: number) {
		this._found = found;
		this._currentPage = currentPage;
		this._totalPages = totalPages;
		this._perPage = perPage;
	}

	get found(): number {
		return this._found;
	}

	get currentPage(): number {
		return this._currentPage;
	}

	get perPage(): number {
		return this._perPage;
	}

	get totalPages(): number {
		return this._totalPages;
	}

	static from(resp: ProtoSearchMetadata): SearchMeta {
		const found = resp?.getFound() ?? 0;
		const currentPage = resp?.getPage()?.getCurrent() ?? 0;
		const perPage = resp?.getPage()?.getPerPage() ?? 0;
		const totalPages = resp?.getPage()?.getTotal() ?? 0;
		return new SearchMeta(found, currentPage, perPage, totalPages);
	}
}
