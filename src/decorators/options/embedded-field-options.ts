import { TigrisDataTypes } from "../../types";

/**
 * Additional type information for Arrays and Objects schema fields
 * @public
 */
export type EmbeddedFieldOptions = {
	elements?: TigrisDataTypes | Function;
	/**
	 * Optionally used to specify nested arrays (Array of arrays).
	 *
	 * @example
	 * - Array<Item> will have `depth` of 1 (need not be specified)
	 * - Array<Array<Item>> will have `depth` of 2
	 * - Array<Array<Array<Item>>> will have `depth` of 3
	 */
	depth?: number;
};
