import { TigrisDataTypes } from "../../../../types";
import { TigrisIndexSchema } from "../../../../search";
import { IndexField } from "../../../../decorators/tigris-index-field";
import { TigrisIndex } from "../../../../decorators/tigris-index";

/******************************************************************************
 * `Order` class demonstrates a Tigris search index schema generated using
 * decorators. Type of index fields is inferred using Reflection APIs. This
 * particular schema example:
 * - has embedded objects
 * - has an Array of embedded objects
 * - and infers the type of fields automatically using Reflection APIs
 *****************************************************************************/
export const ORDERS_INDEX_NAME = "orders";

export class Brand {
	@IndexField()
	name: string;

	@IndexField({ elements: TigrisDataTypes.STRING, index: false })
	tags: Set<string>;
}

export class Product {
	@IndexField()
	name: string;

	@IndexField()
	brand: Brand;

	@IndexField({ sort: false })
	upc: bigint;

	@IndexField({ sort: true, facet: false })
	price: number;
}

@TigrisIndex(ORDERS_INDEX_NAME)
export class Order {
	@IndexField(TigrisDataTypes.UUID, { sort: true })
	orderId: string;

	@IndexField({ facet: false })
	customerId: string;

	@IndexField({ elements: Product })
	products: Array<Product>;
}

/**
 * `TigrisIndexSchema` representation of the collection class above.
 *
 * NOTE: This is only an illustration; you don't have to write this definition,
 * it will be auto generated.
 */
export const OrderSchema: TigrisIndexSchema<Order> = {
	orderId: {
		type: TigrisDataTypes.UUID,
		sort: true,
	},
	customerId: {
		type: TigrisDataTypes.STRING,
		facet: false,
	},
	products: {
		type: TigrisDataTypes.ARRAY,
		items: {
			type: {
				name: {
					type: TigrisDataTypes.STRING,
				},
				brand: {
					type: {
						name: {
							type: TigrisDataTypes.STRING,
						},
						tags: {
							type: TigrisDataTypes.ARRAY,
							index: false,
							items: {
								type: TigrisDataTypes.STRING,
							},
						},
					},
				},
				upc: {
					type: TigrisDataTypes.NUMBER_BIGINT,
					sort: false,
				},
				price: {
					type: TigrisDataTypes.NUMBER,
					sort: true,
					facet: false,
				},
			},
		},
	},
};
