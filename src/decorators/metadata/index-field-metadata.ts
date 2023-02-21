import { TigrisDataTypes } from "../../types";
import { TigrisIndexFieldOptions } from "../../search";

/**@internal*/
export interface IndexFieldMetadata {
	readonly name: string;
	readonly target: Function;
	readonly type: TigrisDataTypes;
	readonly embedType?: TigrisDataTypes | Function;
	readonly arrayDepth?: number;
	readonly schemaFieldOptions?: TigrisIndexFieldOptions;
}
