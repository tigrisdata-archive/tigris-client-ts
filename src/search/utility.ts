import {FacetQueryFieldType, FacetQueryOptions, SearchRequestOptions} from "./types";

export const Utility = {

	createFacetQueryOptions(options?: Partial<FacetQueryOptions>): FacetQueryOptions {
		const defaults = {size: 1, type: FacetQueryFieldType.VALUE};
		return {...defaults, ...options};
	},

	createSearchRequestOptions(options?: Partial<SearchRequestOptions>): SearchRequestOptions {
		const defaults = {page: 1, perPage: 10};
		return {
			...defaults,
			...options
		};
	}
};
