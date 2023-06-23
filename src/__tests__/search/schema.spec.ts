import { TigrisIndexSchema, TigrisIndexType } from "../../search";
import { Order, ORDERS_INDEX_NAME, OrderSchema } from "../fixtures/schema/search/orders";
import { Utility } from "../../utility";
import { readJSONFileAsObj } from "../utils";
import { DecoratedSchemaProcessor, IndexSchema } from "../../schema/decorated-schema-processor";
import { MATRICES_INDEX_NAME, Matrix, MatrixSchema } from "../fixtures/schema/search/matrices";
import { TigrisCollection } from "../../decorators/tigris-collection";
import { Field } from "../../decorators/tigris-field";
import { SearchIndexOptions, TigrisDataTypes } from "../../types";
import { IncorrectVectorDefError } from "../../error";

type SchemaTestCase<T extends TigrisIndexType> = {
	schemaClass: T;
	expectedSchema: TigrisIndexSchema<any>;
	name: string;
	expectedJSON: string;
	expectedOptions?: SearchIndexOptions;
};

const schemas: Array<SchemaTestCase<any>> = [
	{
		schemaClass: Order,
		expectedSchema: OrderSchema,
		name: ORDERS_INDEX_NAME,
		expectedJSON: "orders.json",
		expectedOptions: { tokenSeparators: ["/"] },
	},
	{
		schemaClass: Matrix,
		expectedSchema: MatrixSchema,
		name: MATRICES_INDEX_NAME,
		expectedJSON: "matrices.json",
		expectedOptions: undefined,
	},
];

describe.each(schemas)("Schema conversion for: '$name'", (tc) => {
	const processor = DecoratedSchemaProcessor.Instance;

	test("Convert decorated class to TigrisSchema", () => {
		const generated: IndexSchema<unknown> = processor.processIndex(tc.schemaClass);
		expect(generated.schema).toStrictEqual(tc.expectedSchema);
		expect(generated.options).toStrictEqual(tc.expectedOptions);
	});

	test("Convert TigrisIndexSchema to JSON spec", () => {
		expect(Utility._indexSchematoJSON(tc.name, tc.expectedSchema, tc.expectedOptions)).toBe(
			readJSONFileAsObj("src/__tests__/fixtures/json-schema/search/" + tc.expectedJSON)
		);
	});
});

test("throws error when Vector fields have incorrect type", () => {
	let caught;

	try {
		@TigrisCollection("test_studio")
		class Studio {
			@Field({ dimensions: 3, elements: TigrisDataTypes.STRING })
			actors: Array<string>;
		}
	} catch (e) {
		caught = e;
	}
	expect(caught).toBeInstanceOf(IncorrectVectorDefError);
});
