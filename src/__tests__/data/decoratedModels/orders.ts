import { TigrisCollection } from "../../../decorators/tigris-collection";
import { PrimaryKey } from "../../../decorators/tigris-primary-key";
import { TigrisDataTypes, TigrisSchema } from "../../../types";
import { Field } from "../../../decorators/tigris-field";

/******************************************************************************
 * `Order` class demonstrates a Tigris collection schema generated using
 * decorators. Type of collection fields is inferred using Reflection APIs. This
 * particular schema example:
 * - has multiple primary keys
 * - has embedded objects
 * - has an Array of embedded objects
 * - and infers the type of collection fields automatically using Reflection APIs
 *****************************************************************************/
export class Brand {
	@Field()
	name: string;

	@Field({elements: TigrisDataTypes.STRING})
	tags: Set<string>;
}

export class Product {
	@Field()
	name: string;

	@Field()
	brand: Brand;

	@Field()
	upc: bigint;

	@Field()
	price: number;
}

@TigrisCollection("orders")
export class Order {
	@PrimaryKey(TigrisDataTypes.UUID,{order: 1, autoGenerate: true})
	orderId: string;

	@PrimaryKey({order: 2})
	customerId: string;

	@Field({elements: Product})
	products: Array<Product>
}

/********************************** END **************************************/

/**
 * `TigrisSchema` representation of the collection class above.
 *
 * NOTE: This is only an illustration; you don't have to write this definition,
 * it will be auto generated.
 */
export const ExpectedSchema: TigrisSchema<Order> = {
	orderId: {
		type: TigrisDataTypes.UUID,
		primary_key: {
			order:1,
			autoGenerate: true
		}
	},
	customerId: {
		type: TigrisDataTypes.STRING,
		primary_key: {
			order: 2,
			autoGenerate: false
		}
	},
	products: {
		type: TigrisDataTypes.ARRAY,
		items: {
			type: {
				name: {
					type: TigrisDataTypes.STRING
				},
				brand: {
					type: {
						name: {
							type: TigrisDataTypes.STRING
						},
						tags: {
							type: TigrisDataTypes.ARRAY,
							items: {
								type: TigrisDataTypes.STRING
							}
						}
					}
				},
				upc: {
					type: TigrisDataTypes.NUMBER_BIGINT
				},
				price: {
					type: TigrisDataTypes.NUMBER
				}
			}
		}
	}
}
