import { TigrisCollection } from "../../../decorators/tigris-collection";
import { GeneratedField, TigrisDataTypes, TigrisSchema } from "../../../types";
import { PrimaryKey } from "../../../decorators/tigris-primary-key";
import { Field } from "../../../decorators/tigris-field";

/******************************************************************************
 * `VacationRentals` class demonstrates a Tigris collection schema generated using
 * decorators. This particular schema example:
 * - has an embedded object
 * - infers the type of collection fields automatically using Reflection APIs
 * - demonstrates how to set optional properties like 'defaults' for schema fields
 *****************************************************************************/
export const RENTALS_COLLECTION_NAME = "vacation_rentals";

class Address {
	@Field()
	city: string;

	@Field({ default: "US", maxLength: 2 })
	countryCode: string;
}

@TigrisCollection(RENTALS_COLLECTION_NAME)
export class VacationRentals {
	@PrimaryKey(TigrisDataTypes.UUID, { autoGenerate: true, order: 1 })
	id: string;

	@Field({ maxLength: 64 })
	name: string;

	@Field({ maxLength: 256, default: "" })
	description: string;

	@Field({ default: "Home" })
	propertyType: string;

	@Field({ default: 0 })
	bedrooms: number;

	@Field({ default: 0.0 })
	bathrooms: number;

	@Field(TigrisDataTypes.INT32, { default: 1 })
	minimumNights: number;

	@Field({ default: false })
	isOwnerOccupied: boolean;

	@Field({ default: true })
	hasWiFi: boolean;

	@Field()
	address: Address;

	@Field({ default: { stateId: true } })
	verifications: Object;

	@Field({ elements: TigrisDataTypes.STRING, default: ["Beds"] })
	amenities: Array<string>;

	@Field({ elements: TigrisDataTypes.STRING, default: [] })
	attractions: Array<string>;

	@Field({ default: null })
	host: object;

	@Field({ elements: TigrisDataTypes.OBJECT, default: undefined })
	reviews: Array<Object>;

	@Field({ default: GeneratedField.NOW })
	availableSince: Date;

	@Field({ default: GeneratedField.NOW, timestamp: "updatedAt" })
	lastSeen: Date;

	@Field({ timestamp: "createdAt" })
	createdAt: Date;

	@Field({ timestamp: "updatedAt" })
	lastModified: Date;

	@Field({ default: GeneratedField.CUID })
	partnerId: string;

	@Field(TigrisDataTypes.UUID, { default: GeneratedField.UUID })
	referralId: string;
}
/********************************** END **************************************/

/**
 * `TigrisSchema` representation of the collection class above.
 *
 * NOTE: This is only an illustration; you don't have to write this definition,
 * it will be auto generated.
 */
export const VacationsRentalSchema: TigrisSchema<VacationRentals> = {
	id: {
		type: TigrisDataTypes.UUID,
		primary_key: {
			autoGenerate: true,
			order: 1,
		},
	},
	name: {
		type: TigrisDataTypes.STRING,
		maxLength: 64,
	},
	description: {
		type: TigrisDataTypes.STRING,
		maxLength: 256,
		default: "",
	},
	propertyType: {
		type: TigrisDataTypes.STRING,
		default: "Home",
	},
	bedrooms: {
		type: TigrisDataTypes.NUMBER,
		default: 0,
	},
	bathrooms: {
		type: TigrisDataTypes.NUMBER,
		default: 0.0,
	},
	minimumNights: {
		type: TigrisDataTypes.INT32,
		default: 1,
	},
	isOwnerOccupied: {
		type: TigrisDataTypes.BOOLEAN,
		default: false,
	},
	hasWiFi: {
		type: TigrisDataTypes.BOOLEAN,
		default: true,
	},
	address: {
		type: {
			city: {
				type: TigrisDataTypes.STRING,
			},
			countryCode: {
				type: TigrisDataTypes.STRING,
				default: "US",
				maxLength: 2,
			},
		},
	},
	verifications: {
		type: TigrisDataTypes.OBJECT,
		default: { stateId: true },
	},
	amenities: {
		type: TigrisDataTypes.ARRAY,
		items: {
			type: TigrisDataTypes.STRING,
		},
		default: ["Beds"],
	},
	attractions: {
		type: TigrisDataTypes.ARRAY,
		items: {
			type: TigrisDataTypes.STRING,
		},
		default: [],
	},
	host: {
		type: TigrisDataTypes.OBJECT,
		default: null,
	},
	reviews: {
		type: TigrisDataTypes.ARRAY,
		items: {
			type: TigrisDataTypes.OBJECT,
		},
		default: undefined,
	},
	availableSince: {
		type: TigrisDataTypes.DATE_TIME,
		default: GeneratedField.NOW,
	},
	lastSeen: {
		type: TigrisDataTypes.DATE_TIME,
		default: GeneratedField.NOW,
		timestamp: "updatedAt",
	},
	createdAt: {
		type: TigrisDataTypes.DATE_TIME,
		timestamp: "createdAt",
	},
	lastModified: {
		type: TigrisDataTypes.DATE_TIME,
		timestamp: "updatedAt",
	},
	partnerId: {
		type: TigrisDataTypes.STRING,
		default: GeneratedField.CUID,
	},
	referralId: {
		type: TigrisDataTypes.UUID,
		default: GeneratedField.UUID,
	},
};
