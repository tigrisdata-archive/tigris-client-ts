import { SearchIndexOptions } from "../../types";

/**@internal*/
export interface SearchIndexMetadata {
	readonly indexName: string;
	readonly target: Function;
	readonly options: SearchIndexOptions;
}
