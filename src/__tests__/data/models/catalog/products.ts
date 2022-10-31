import {
	TigrisCollectionType,
	TigrisDataTypes,
	TigrisSchema
} from '../../../../types'

export interface Product extends TigrisCollectionType {
	id?: number;
	title: string;
	description: string;
	price: number;
}

export const ProductSchema: TigrisSchema<Product> = {
	id: {
		type: TigrisDataTypes.INT32,
		primary_key: { order: 1, autoGenerate: true }
	},
	title: { type: TigrisDataTypes.STRING },
	description: { type: TigrisDataTypes.STRING },
	price: { type: TigrisDataTypes.NUMBER }
}
