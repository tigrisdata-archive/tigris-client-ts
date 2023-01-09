import { TigrisCollectionType, TigrisDataTypes, TigrisSchema } from "../../../types";
import { PrimaryKey } from "../../../decorators/tigris-primary-key";
import { Field } from "../../../decorators/tigris-field";
import { TigrisCollection } from "../../../decorators/tigris-collection";

/******************************************************************************
 * `User` class demonstrates a Tigris collection schema generated using
 * decorators. Type of collection fields is inferred using Reflection APIs. This
 * particular schema example:
 * - has an Array of embedded objects
 * - has an Array of primitive types
 * - infers the type of collection fields automatically using Reflection APIs
 *****************************************************************************/
export const USERS_COLLECTION_NAME = "users";

export class Identity {
	@Field({ maxLength: 128 })
	connection?: string;

	@Field()
	isSocial: boolean;

	@Field({ elements: TigrisDataTypes.NUMBER })
	provider: Array<number>;

	@Field()
	linkedAccounts: number;
}

@TigrisCollection(USERS_COLLECTION_NAME)
export class User {
	@PrimaryKey({ order: 1 })
	id: number;

	@Field()
	created: Date;

	@Field({ elements: Identity })
	identities: Array<Identity>;

	@Field()
	name: string;
}

/********************************** END **************************************/

/**
 * `TigrisSchema` representation of the collection class above.
 *
 * NOTE: This is only an illustration; you don't have to write this definition,
 * it will be auto generated.
 */
export const UserSchema: TigrisSchema<User> = {
	id: {
		type: TigrisDataTypes.NUMBER,
		primary_key: {
			order: 1,
			autoGenerate: false,
		},
	},
	created: {
		type: TigrisDataTypes.DATE_TIME,
	},
	identities: {
		type: TigrisDataTypes.ARRAY,
		items: {
			type: {
				connection: {
					type: TigrisDataTypes.STRING,
					maxLength: 128,
				},
				isSocial: {
					type: TigrisDataTypes.BOOLEAN,
				},
				provider: {
					type: TigrisDataTypes.ARRAY,
					items: {
						type: TigrisDataTypes.NUMBER,
					},
				},
				linkedAccounts: {
					type: TigrisDataTypes.NUMBER,
				},
			},
		},
	},
	name: {
		type: TigrisDataTypes.STRING,
	},
};
