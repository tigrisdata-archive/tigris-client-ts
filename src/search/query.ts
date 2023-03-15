import { DocumentFields, DocumentPaths, Filter, SortOrder, TigrisCollectionType } from "../types";

export const MATCH_ALL_QUERY_STRING = "";

/**
 * Search query builder
 */
export interface SearchQuery<T extends TigrisCollectionType> {
	/**
	 * Text to match
	 */
	q?: string;
	/**
	 * Fields to project search query on
	 */
	searchFields?: DocumentPaths<T>;
	/**
	 * Filter to further refine the search results
	 */
	filter?: Filter<T>;
	/**
	 * Facet fields to categorically arrange indexed terms
	 */
	facets?: FacetFieldsQuery<T>;
	/**
	 * Sort the search results in indicated order
	 */
	sort?: SortOrder;
	/**
	 * Document fields to include when returning search results
	 */
	includeFields?: DocumentPaths<T>;
	/**
	 * Document fields to exclude when returning search results
	 */
	excludeFields?: DocumentPaths<T>;
	/**
	 * Maximum number of search hits (matched documents) to fetch per page
	 */
	hitsPerPage?: number;

	/**
	 * Other parameters for search query
	 */
	options?: SearchQueryOptions;
}

/**
 * Options for search query
 */
export interface SearchQueryOptions {
	/**
	 * String comparison rules for filtering. E.g. - Case insensitive text match
	 */
	collation?: Collation;
}

export type FacetFieldsQuery<T> = FacetFieldOptions<T> | FacetFields<T>;

/**
 * Map of collection field names and faceting options to include facet results in search response
 */
export type FacetFieldOptions<T> = DocumentFields<T, FacetQueryOptions>;

/**
 * Array of field names to include facet results for in search response
 */
export type FacetFields<T> = DocumentPaths<T>;

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
