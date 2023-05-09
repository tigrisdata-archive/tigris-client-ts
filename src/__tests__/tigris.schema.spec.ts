import { CollectionSchema, DecoratedSchemaProcessor } from "../schema/decorated-schema-processor";
import { TigrisCollectionType, TigrisDataTypes, TigrisSchema } from "../types";
import { User, USERS_COLLECTION_NAME, UserSchema } from "./fixtures/schema/users";
import {
	RENTALS_COLLECTION_NAME,
	VacationRentals,
	VacationsRentalSchema,
} from "./fixtures/schema/vacationRentals";
import { Field } from "../decorators/tigris-field";
import {
	IncompleteArrayTypeDefError,
	IncompletePrimaryKeyOrderError,
	IncorrectVectorDefError,
} from "../error";
import { TigrisCollection } from "../decorators/tigris-collection";
import { Utility } from "../utility";
import { Order, ORDERS_COLLECTION_NAME, OrderSchema } from "./fixtures/schema/orders";
import { Movie, MOVIES_COLLECTION_NAME, MovieSchema } from "./fixtures/schema/movies";
import { MATRICES_COLLECTION_NAME, Matrix, MatrixSchema } from "./fixtures/schema/matrices";
import { readJSONFileAsObj } from "./utils";
import { STUDENT_COLLECTION_NAME, Student, StudentSchema } from "./fixtures/schema/student";
import { PrimaryKey } from "../decorators/tigris-primary-key";

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
	{
		schemaClass: Student,
		expectedSchema: StudentSchema,
		name: STUDENT_COLLECTION_NAME,
		expectedJson: "students.json",
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

test("throws error when Schema is invalid with more than one primary key but no orders specified", () => {
	const processor = DecoratedSchemaProcessor.Instance;
	let caught;
	try {
		/**
		 * Schema is INVALID as it contains two primary keys but no order was specified
		 * in decorator under PrimaryKeyOptions.
		 */
		const INVALID_STUDENT_COLLECTION_NAME = "invalid_students";
		@TigrisCollection(INVALID_STUDENT_COLLECTION_NAME)
		class InvalidStudent {
			@PrimaryKey(TigrisDataTypes.INT64)
			id?: string;

			@PrimaryKey(TigrisDataTypes.STRING)
			email: string;

			@Field()
			firstName!: string;

			@Field()
			lastName!: string;

			@Field({ timestamp: "createdAt" })
			createdAt?: Date;
		}

		processor.processCollection(InvalidStudent);
	} catch (err) {
		caught = err;
	}
	expect(caught).toBeInstanceOf(IncompletePrimaryKeyOrderError);
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
