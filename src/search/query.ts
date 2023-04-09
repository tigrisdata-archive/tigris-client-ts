import { Filter, SortOrder, TigrisCollectionType } from "../types";
import { TigrisIndexType } from "./types";

export const MATCH_ALL_QUERY_STRING = "";

/**
 * Search query builder
 */
export interface SearchQuery<T extends TigrisCollectionType | TigrisIndexType> {
	/**
	 * Text to match
	 */
	q?: string;
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
	 * Perform a nearest neighbor search to find closest documents
	 */
	vectorQuery?: VectorQuery;
	/**
	 * Sort the search results in indicated order
	 */
	sort?: SortOrder;
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
 * A VectorQuery allows you to perform nearest neighbor search.
 */
export type VectorQuery = {
	/**
	 * Document field to query against. The field must be of 'Vector' type.
	 */
	field: string;
	/**
	 * Get nearest neighbors of this array of floating point numbers
	 */
	vector: Array<number>;
};
