import { SearchField } from "../../../../decorators/tigris-search-field";
import { TigrisSearchIndex } from "../../../../decorators/tigris-search-index";
import { TigrisIndexSchema } from "../../../../search";
import { TigrisDataTypes } from "../../../../types";

/******************************************************************************
 * `Matrix` class demonstrates a Tigris search index generated using
 * decorators. Type of schema fields is inferred using Reflection APIs. This
 * particular schema example:
 * - has a nested Array (Array of Arrays)
 * - infers the type of index fields automatically using Reflection APIs
 *****************************************************************************/
export const MATRICES_INDEX_NAME = "matrices";

export class Cell {
	@SearchField()
	x: number;

	@SearchField()
	y: number;

	@SearchField({ id: true })
	value: string;
}

@TigrisSearchIndex(MATRICES_INDEX_NAME)
export class Matrix {
	@SearchField({ facet: false })
	id: string;

	@SearchField({ elements: Cell, depth: 3 })
	cells: Cell[][][];

	@SearchField({ dimensions: 4, sort: false })
	relevance: Array<number>;
}
/********************************** END **************************************/

/**
 * `TigrisSchema` representation of the collection class above.
 *
 * NOTE: This is only an illustration; you don't have to write this definition,
 * it will be auto generated.
 */

export const MatrixSchema: TigrisIndexSchema<Matrix> = {
	id: {
		type: TigrisDataTypes.STRING,
		searchIndex: true,
		facet: false,
	},
	cells: {
		type: TigrisDataTypes.ARRAY,
		searchIndex: true,
		items: {
			type: TigrisDataTypes.ARRAY,
			items: {
				type: TigrisDataTypes.ARRAY,
				items: {
					type: {
						x: {
							type: TigrisDataTypes.NUMBER,
						},
						y: {
							type: TigrisDataTypes.NUMBER,
						},
						value: {
							type: TigrisDataTypes.STRING,
						},
					},
				},
			},
		},
	},
	relevance: {
		type: TigrisDataTypes.ARRAY,
		searchIndex: true,
		sort: false,
		dimensions: 4,
		items: {
			type: TigrisDataTypes.NUMBER,
		},
	},
};
