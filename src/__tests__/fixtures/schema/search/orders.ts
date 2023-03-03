import { TigrisDataTypes } from "../../../../types";
import { TigrisIndexSchema } from "../../../../search";
import { SearchField } from "../../../../decorators/tigris-search-field";
import { TigrisSearchIndex } from "../../../../decorators/tigris-search-index";

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
	@SearchField()
	name: string;

	@SearchField({ elements: TigrisDataTypes.STRING, index: false })
	tags: Set<string>;
}

export class Product {
	@SearchField()
	name: string;

	@SearchField()
	brand: Brand;

	@SearchField({ index: false, sort: false })
	upc: bigint;

	@SearchField({ sort: true, facet: false })
	price: number;
}

@TigrisSearchIndex(ORDERS_INDEX_NAME)
export class Order {
	@SearchField(TigrisDataTypes.UUID, { sort: true })
	orderId: string;

	@SearchField({ facet: false })
	customerId: string;

	@SearchField({ elements: Product })
	products: Array<Product>;
}

/**
 * `TigrisIndexSchema` representation of the Order class above.
 *
 * NOTE: This is only an illustration; you don't have to write this definition,
 * it will be auto generated.
 */
export const OrderSchema: TigrisIndexSchema<Order> = {
	orderId: {
		type: TigrisDataTypes.UUID,
		index: true,
		sort: true,
	},
	customerId: {
		type: TigrisDataTypes.STRING,
		index: true,
		facet: false,
	},
	products: {
		type: TigrisDataTypes.ARRAY,
		index: true,
		items: {
			type: {
				name: {
					type: TigrisDataTypes.STRING,
					index: true,
				},
				brand: {
					index: true,
					type: {
						name: {
							type: TigrisDataTypes.STRING,
							index: true,
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
					index: false,
					sort: false,
				},
				price: {
					type: TigrisDataTypes.NUMBER,
					index: true,
					sort: true,
					facet: false,
				},
			},
		},
	},
};
