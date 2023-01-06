import { TigrisCollection } from "../../../decorators/tigris-collection";
import { PrimaryKey } from "../../../decorators/tigris-primary-key";
import { TigrisCollectionType, TigrisDataTypes, TigrisSchema } from "../../../types";
import { Field } from "../../../decorators/tigris-field";

/******************************************************************************
 * `Movie` class demonstrates a Tigris collection schema generated using
 * decorators. This particular schema example:
 * - has an Array of another class as embedded Object
 * - has an Array of primitive types
 * - has an Object of type `Studio`
 * - does not use reflection, all the collection fields are explicitly typed
 *****************************************************************************/
export const MOVIES_COLLECTION_NAME = "movies";

export class Studio {
	@Field(TigrisDataTypes.STRING)
	name: string;

	@Field(TigrisDataTypes.STRING)
	city: string;
}

export class Actor {
	@Field(TigrisDataTypes.STRING, { maxLength: 64 })
	firstName: string;

	@Field(TigrisDataTypes.STRING, { maxLength: 64 })
	lastName: string;
}

@TigrisCollection(MOVIES_COLLECTION_NAME)
export class Movie {
	@PrimaryKey(TigrisDataTypes.STRING, { order: 1 })
	movieId: string;

	@Field(TigrisDataTypes.STRING)
	title: string;

	@Field(TigrisDataTypes.INT32)
	year: number;

	@Field(TigrisDataTypes.ARRAY, { elements: Actor })
	actors: Array<Actor>;

	@Field(TigrisDataTypes.ARRAY, { elements: TigrisDataTypes.STRING })
	genres: Array<string>;

	@Field(TigrisDataTypes.OBJECT, { elements: Studio })
	productionHouse: Studio;
}

/********************************** END **************************************/

/**
 * `TigrisSchema` representation of the collection class above.
 *
 * NOTE: This is only an illustration; you don't have to write this definition,
 * it will be auto generated.
 */
export const MovieSchema: TigrisSchema<Movie> = {
	movieId: {
		type: TigrisDataTypes.STRING,
		primary_key: {
			order: 1,
			autoGenerate: false,
		},
	},
	title: {
		type: TigrisDataTypes.STRING,
	},
	year: {
		type: TigrisDataTypes.INT32,
	},
	actors: {
		type: TigrisDataTypes.ARRAY,
		items: {
			type: {
				firstName: {
					type: TigrisDataTypes.STRING,
					maxLength: 64,
				},
				lastName: {
					type: TigrisDataTypes.STRING,
					maxLength: 64,
				},
			},
		},
	},
	genres: {
		type: TigrisDataTypes.ARRAY,
		items: {
			type: TigrisDataTypes.STRING,
		},
	},
	productionHouse: {
		type: {
			name: {
				type: TigrisDataTypes.STRING,
			},
			city: {
				type: TigrisDataTypes.STRING,
			},
		},
	},
};
