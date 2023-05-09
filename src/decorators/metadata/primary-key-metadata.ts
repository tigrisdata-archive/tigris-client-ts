import { PrimaryKeyOptions, TigrisDataTypes } from "../../types";

/**@internal*/
export interface PrimaryKeyMetadata {
	readonly name: string;
	readonly target: Function;
	type: TigrisDataTypes;
	readonly options: PrimaryKeyOptions;
}
