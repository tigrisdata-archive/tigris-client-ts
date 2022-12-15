import { Field } from "../../../decorators/tigris-field";
import { TigrisCollectionType, TigrisDataTypes, TigrisSchema } from "../../../types";
import { TigrisCollection } from "../../../decorators/tigris-collection";
import { PrimaryKey } from "../../../decorators/tigris-primary-key";

/******************************************************************************
 * `Matrix` class demonstrates a Tigris collection schema generated using
 * decorators. Type of collection fields is inferred using Reflection APIs. This
 * particular schema example:
 * - has a nested Array (Array of Arrays)
 * - infers the type of collection fields automatically using Reflection APIs
 *****************************************************************************/
export class CellValue {
	@Field()
	length: number

	@Field()
	type: string;
}

export class Cell {
	@Field()
	x: number;

	@Field()
	y: number;

	@Field()
	value: CellValue;
}

@TigrisCollection("matrices")
export class Matrix implements TigrisCollectionType {
	@PrimaryKey({order: 1})
	id: string;

	@Field({elements: Cell, depth: 3})
	cells: Array<Array<Array<Cell>>>;
}
/********************************** END **************************************/

/**
 * `TigrisSchema` representation of the collection class above.
 *
 * NOTE: This is only an illustration; you don't have to write this definition,
 * it will be auto generated.
 */
export const ExpectedSchema: TigrisSchema<Matrix> = {
	id: {
		type: TigrisDataTypes.STRING,
		primary_key: {
			order: 1,
			autoGenerate: false
		},
	},
	cells: {
		type: TigrisDataTypes.ARRAY,
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
							type: {
								length: {
									type: TigrisDataTypes.NUMBER
								},
								type: {
									type: TigrisDataTypes.STRING
								}
							},
						},
					}
				}
			}
		}
	}
}
