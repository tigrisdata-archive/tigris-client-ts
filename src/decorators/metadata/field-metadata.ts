import { TigrisDataTypes, CollectionFieldOptions } from "../../types";

/**@internal*/
export interface FieldMetadata {
	readonly name: string;
	readonly target: Function;
	readonly type: TigrisDataTypes;
	readonly embedType?: TigrisDataTypes | Function;
	readonly arrayDepth?: number;
	readonly schemaFieldOptions?: CollectionFieldOptions;
}
