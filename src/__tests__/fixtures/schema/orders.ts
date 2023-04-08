import { TigrisCollection } from "../../../decorators/tigris-collection";
import { PrimaryKey } from "../../../decorators/tigris-primary-key";
import { TigrisDataTypes, TigrisSchema } from "../../../types";
import { Field } from "../../../decorators/tigris-field";
import { SearchField } from "../../../decorators/tigris-search-field";

/******************************************************************************
 * `Order` class demonstrates a Tigris collection schema generated using
 * decorators. Type of collection fields is inferred using Reflection APIs. This
 * particular schema example:
 * - has multiple primary keys
 * - has embedded objects
 * - has an Array of embedded objects
 * - collection has search indexing enabled on certain fields
 * - and infers the type of collection fields automatically using Reflection APIs
 *****************************************************************************/
export const ORDERS_COLLECTION_NAME = "orders";

export class Brand {
	@Field()
	@SearchField()
	name: string;

	@Field({ elements: TigrisDataTypes.STRING })
	tags: Set<string>;
}

export class Product {
	@Field({ maxLength: 64 })
	name: string;

	@Field()
	brand: Brand;

	@Field()
	upc: bigint;

	@Field()
	@SearchField({ sort: true, facet: false })
	price: number;
}

@TigrisCollection(ORDERS_COLLECTION_NAME)
export class Order {
	@PrimaryKey(TigrisDataTypes.UUID, { order: 1, autoGenerate: true })
	orderId: string;

	@PrimaryKey({ order: 2 })
	@SearchField({ searchIndex: false, sort: false, facet: false })
	customerId: string;

	@Field({ elements: Product })
	products: Array<Product>;
}

/********************************** END **************************************/

/**
 * `TigrisSchema` representation of the collection class above.
 *
 * NOTE: This is only an illustration; you don't have to write this definition,
 * it will be auto generated.
 */
export const OrderSchema: TigrisSchema<Order> = {
	orderId: {
		type: TigrisDataTypes.UUID,
		primary_key: {
			order: 1,
			autoGenerate: true,
		},
	},
	customerId: {
		type: TigrisDataTypes.STRING,
		searchIndex: false,
		sort: false,
		facet: false,
		primary_key: {
			order: 2,
			autoGenerate: false,
		},
	},
	products: {
		type: TigrisDataTypes.ARRAY,
		items: {
			type: {
				name: {
					type: TigrisDataTypes.STRING,
					maxLength: 64,
				},
				brand: {
					type: {
						name: {
							type: TigrisDataTypes.STRING,
						},
						tags: {
							type: TigrisDataTypes.ARRAY,
							items: {
								type: TigrisDataTypes.STRING,
							},
						},
					},
				},
				upc: {
					type: TigrisDataTypes.NUMBER_BIGINT,
				},
				price: {
					type: TigrisDataTypes.NUMBER,
				},
			},
		},
	},
};
