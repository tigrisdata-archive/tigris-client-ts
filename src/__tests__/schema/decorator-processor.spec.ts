import {
	CollectionSchema,
	DecoratedSchemaProcessor,
} from "../../schema/decorated-schema-processor";
import { TigrisCollectionType, TigrisSchema } from "../../types";
import { ExpectedSchema as UserSchema, User } from "../data/./decoratedModels/users";
import { ExpectedSchema as OrderSchema, Order } from "../data/./decoratedModels/orders";
import { ExpectedSchema as MovieSchema, Movie } from "../data/./decoratedModels/movies";
import { ExpectedSchema as MatricesSchema, Matrix } from "../data/./decoratedModels/matrices";

/*
 * TODO: Add following tests
 *
 * add a constructor to class and subclasses
 * readonly properties (getter/setter)
 * custom constructor
 * embedded definitions are empty
 */

describe("Generate TigrisSchema from decorated classes", () => {
	const processor = DecoratedSchemaProcessor.Instance;
	type AnnotationTestCase<T extends TigrisCollectionType> = {
		schemaClass: T;
		expected: TigrisSchema<any>;
	};
	const schemaDefinitions: Array<AnnotationTestCase<any>> = [
		{ schemaClass: User, expected: UserSchema },
		{ schemaClass: Order, expected: OrderSchema },
		{ schemaClass: Movie, expected: MovieSchema },
		{ schemaClass: Matrix, expected: MatricesSchema },
	];
	test.each(schemaDefinitions)("from %p schema", (tc) => {
		const generated: CollectionSchema<unknown> = processor.process(tc.schemaClass);
		expect(generated.schema).toStrictEqual(tc.expected);
		// TODO: validate type compatibility
	});
});
