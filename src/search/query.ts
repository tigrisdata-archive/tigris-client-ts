import { DocumentPaths, Filter, SortOrder, TigrisCollectionType } from "../types";
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
	searchFields?: Array<DocumentPaths<T>>;
	/**
	 * Filter to further refine the search results
	 */
	filter?: Filter<T>;
	/**
	 * Facet fields to categorically arrange indexed terms
	 */
	facets?: FacetFieldsQuery<T>;
	/**
	 * Perform a nearest neighbor search to find closest documents
	 */
	vectorQuery?: VectorQuery;
	/**
	 * Sort the search results in indicated order
	 */
	sort?: SortOrder<T>;
	/**
	 * Group by single or multiple fields in the index
	 */
	groupBy?: Array<string>;
	/**
	 * Document fields to include when returning search results
	 */
	includeFields?: Array<DocumentPaths<T>>;
	/**
	 * Document fields to exclude when returning search results
	 */
	excludeFields?: Array<DocumentPaths<T>>;
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
export type FacetFieldOptions<T> = {
	[K in DocumentPaths<T>]?: FacetQueryOptions;
};

/**
 * Array of field names to include facet results for in search response
 */
export type FacetFields<T> = Array<DocumentPaths<T>>;

/**
 * Information to build facets in search results
 *
 */
export type FacetQueryOptions = {
	/**
	 * Maximum number of facets to include in results
	 * default - 10
	 */
	size: number;
	/**
	 * Type of facets to build
	 */
	type?: "value";
};

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
	 * Document field to query against and the vector value to find nearest neighbors.
	 * The field must be of 'Vector' type.
	 */
	[key: string]: Array<number>;
};
