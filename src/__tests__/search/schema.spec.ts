import { TigrisIndexSchema, TigrisIndexType } from "../../search";
import { Order, ORDERS_INDEX_NAME, OrderSchema } from "../fixtures/schema/search/orders";
import { Utility } from "../../utility";
import { readJSONFileAsObj } from "../utils";
import { DecoratedSchemaProcessor, IndexSchema } from "../../schema/decorated-schema-processor";

type SchemaTestCase<T extends TigrisIndexType> = {
	schemaClass: T;
	expectedSchema: TigrisIndexSchema<any>;
	name: string;
	expectedJSON: string;
};

const schemas: Array<SchemaTestCase<any>> = [
	{
		schemaClass: Order,
		expectedSchema: OrderSchema,
		name: ORDERS_INDEX_NAME,
		expectedJSON: "orders.json",
	},
];

describe.each(schemas)("Schema conversion for: '$name'", (tc) => {
	const processor = DecoratedSchemaProcessor.Instance;

	test("Convert decorated class to TigrisSchema", () => {
		const generated: IndexSchema<unknown> = processor.processIndex(tc.schemaClass);
		expect(generated.schema).toStrictEqual(tc.expectedSchema);
	});

	test("Convert TigrisIndexSchema to JSON spec", () => {
		expect(Utility._schematoJSON(tc.name, tc.expectedSchema)).toBe(
			readJSONFileAsObj("src/__tests__/fixtures/json-schema/search/" + tc.expectedJSON)
		);
	});
});
