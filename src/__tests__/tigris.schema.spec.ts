import { CollectionSchema, DecoratedSchemaProcessor } from "../schema/decorated-schema-processor";
import { TigrisCollectionType, TigrisSchema } from "../types";
import { User, USERS_COLLECTION_NAME, UserSchema } from "./fixtures/schema/users";
import {
	VacationRentals,
	RENTALS_COLLECTION_NAME,
	VacationsRentalSchema,
} from "./fixtures/schema/vacationRentals";
import { Field } from "../decorators/tigris-field";
import { IncompleteArrayTypeDefError } from "../error";
import { TigrisCollection } from "../decorators/tigris-collection";
import { Utility } from "../utility";
import { Order, ORDERS_COLLECTION_NAME, OrderSchema } from "./fixtures/schema/orders";
import { Movie, MOVIES_COLLECTION_NAME, MovieSchema } from "./fixtures/schema/movies";
import { MATRICES_COLLECTION_NAME, Matrix, MatrixSchema } from "./fixtures/schema/matrices";
import { readJSONFileAsObj } from "./utils";

type SchemaTestCase<T extends TigrisCollectionType> = {
	schemaClass: T;
	expectedSchema: TigrisSchema<any>;
	name: string;
	expectedJson: string;
};

const schemas: Array<SchemaTestCase<any>> = [
	{
		schemaClass: User,
		expectedSchema: UserSchema,
		name: USERS_COLLECTION_NAME,
		expectedJson: "users.json",
	},
	{
		schemaClass: Order,
		expectedSchema: OrderSchema,
		name: ORDERS_COLLECTION_NAME,
		expectedJson: "orders.json",
	},
	{
		schemaClass: Movie,
		expectedSchema: MovieSchema,
		name: MOVIES_COLLECTION_NAME,
		expectedJson: "movies.json",
	},
	{
		schemaClass: Matrix,
		expectedSchema: MatrixSchema,
		name: MATRICES_COLLECTION_NAME,
		expectedJson: "matrices.json",
	},
	{
		schemaClass: VacationRentals,
		expectedSchema: VacationsRentalSchema,
		name: RENTALS_COLLECTION_NAME,
		expectedJson: "vacationRentals.json",
	},
];

/*
 * TODO: Add following tests
 *
 * readonly properties (getter/setter)
 * custom constructor
 * embedded definitions are empty
 */
describe.each(schemas)("Schema conversion for: '$name'", (tc) => {
	const processor = DecoratedSchemaProcessor.Instance;

	test("Convert decorated class to TigrisSchema", () => {
		const generated: CollectionSchema<unknown> = processor.processCollection(tc.schemaClass);
		expect(generated.schema).toStrictEqual(tc.expectedSchema);
	});

	test("Convert TigrisSchema to JSON spec", () => {
		expect(Utility._collectionSchematoJSON(tc.name, tc.expectedSchema)).toBe(
			readJSONFileAsObj("src/__tests__/fixtures/json-schema/" + tc.expectedJson)
		);
	});
});

test("throws error when Arrays are not properly decorated", () => {
	let caught;

	try {
		@TigrisCollection("test_studio")
		class Studio {
			@Field()
			actors: Array<string>;
		}
	} catch (e) {
		caught = e;
	}
	expect(caught).toBeInstanceOf(IncompleteArrayTypeDefError);
});
