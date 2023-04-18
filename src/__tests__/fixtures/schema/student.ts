import { TigrisCollection } from "../../../decorators/tigris-collection";
import { PrimaryKey } from "../../../decorators/tigris-primary-key";
import { TigrisDataTypes, TigrisSchema } from "../../../types";
import { Field } from "../../../decorators/tigris-field";

/******************************************************************************
 * `Student` class demonstrates a Tigris collection schema generated using
 * decorators. Type of collection fields is inferred using Reflection APIs. This
 * particular schema example:
 * - infers the type of collection fields automatically using Reflection APIs
 * - has multiple primary keys
 *****************************************************************************/
export const STUDENT_COLLECTION_NAME = "students";

@TigrisCollection(STUDENT_COLLECTION_NAME)
export class Student {
	@PrimaryKey(TigrisDataTypes.INT64, { order: 1, autoGenerate: true })
	id?: string;

	@PrimaryKey(TigrisDataTypes.STRING, { order: 2 })
	email: string;

	@Field()
	firstName!: string;

	@Field()
	lastName!: string;

	@Field({ timestamp: "createdAt" })
	createdAt?: Date;
}

/********************************** END **************************************/

/******************************************************************************
 * `InvalidStudent` class demonstrates a Tigris collection schema validation,
 *  Schema is INVALID as it contains two primary keys but no order was specified
 *  in decorator under PrimaryKeyOptions.
 *****************************************************************************/
export const INVALID_STUDENT_COLLECTION_NAME = "invalid_students";

@TigrisCollection(INVALID_STUDENT_COLLECTION_NAME)
export class InvalidStudent {
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

/********************************** END **************************************/

/**
 * `TigrisSchema` representation of the `Student` collection class .
 *
 * NOTE: This is only an illustration; you don't have to write this definition,
 * it will be auto generated.
 */
export const StudentSchema: TigrisSchema<Student> = {
	id: {
		type: TigrisDataTypes.INT64,
		primary_key: {
			order: 1,
			autoGenerate: true,
		},
	},
	email: {
		type: TigrisDataTypes.STRING,
		primary_key: {
			order: 2,
			autoGenerate: false,
		},
	},
	firstName: {
		type: TigrisDataTypes.STRING,
	},
	lastName: {
		type: TigrisDataTypes.STRING,
	},
	createdAt: {
		type: TigrisDataTypes.DATE_TIME,
		timestamp: "createdAt",
	},
};
