import { TigrisDataTypes } from "../../types";
import { SearchFieldOptions } from "../../search";

/**@internal*/
export interface SearchFieldMetadata {
	readonly name: string;
	readonly target: Function;
	readonly type: TigrisDataTypes;
	readonly embedType?: TigrisDataTypes | Function;
	readonly arrayDepth?: number;
	readonly schemaFieldOptions?: SearchFieldOptions;
}
