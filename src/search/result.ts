import { IterableCursor, TigrisCollectionType } from "../types";

export type Facets = { [key: string]: FacetCountDistribution };
export type GroupedHits<T> = { groupKeys: string[]; hits: Array<IndexedDoc<T>> };

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
	readonly meta: SearchMeta;
	/**
	 * Array of matched documents when group_by is used in the search request.
	 * @readonly
	 * @defaultValue []
	 */
	readonly groupedHits: GroupedHits<T>[];

	constructor(
		hits: Array<IndexedDoc<T>>,
		facets: Facets,
		meta: SearchMeta,
		groupedHits: GroupedHits<T>[]
	) {
		this.hits = hits;
		this.facets = facets;
		this.meta = meta;
		this.groupedHits = groupedHits;
	}

	static get empty(): SearchResult<never> {
		return new SearchResult([], {}, SearchMeta.default, []);
	}
}

export interface SearchCursor<T> extends IterableCursor<SearchResult<T>> {}

/**
 * Matched document and relevance metadata for a search query
 * @typeParam T - type of Tigris collection
 */
export class IndexedDoc<T extends TigrisCollectionType> {
	/**
	 * Deserialized collection/search index document
	 * @readonly
	 */
	readonly document: T;
	/**
	 * Relevance metadata for the matched document
	 * @readonly
	 */
	readonly meta: DocMeta;

	constructor(document: T, meta: DocMeta) {
		this.document = document;
		this.meta = meta;
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
	readonly createdAt: Date;
	/**
	 * Time at which document was updated to a precision of milliseconds
	 * @readonly
	 */
	readonly updatedAt: Date;
	/**
	 * Metadata for matched fields and relevant score
	 * @readonly
	 */
	readonly textMatch: TextMatchInfo;

	constructor(createdAt: Date, updatedAt: Date, textMatch: TextMatchInfo) {
		this.createdAt = createdAt;
		this.updatedAt = updatedAt;
		this.textMatch = textMatch;
	}
}

/**
 * Information about the matched document
 */
export class TextMatchInfo {
	readonly fields: ReadonlyArray<string>;
	readonly score: string;
	readonly vectorDistance?: number;

	constructor(fields: ReadonlyArray<string>, score: string, vectorDistance?: number) {
		this.fields = fields;
		this.score = score;
		if (vectorDistance) {
			this.vectorDistance = vectorDistance;
		}
	}
}

/**
 * Distribution of values in a faceted field
 */
export class FacetCountDistribution {
	/**
	 * List of field values and their aggregated counts
	 * @readonly
	 */
	readonly counts: ReadonlyArray<FacetCount>;

	/**
	 * Summary of faceted field
	 * @readonly
	 */
	readonly stats: FacetStats;

	constructor(counts: ReadonlyArray<FacetCount>, stats: FacetStats) {
		this.counts = counts;
		this.stats = stats;
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

	/**
	 * @returns the pre-defined page number and size to construct a default response
	 * @readonly
	 */
	static get default(): Page {
		return new Page(1, 20);
	}
}
