import { TigrisCollectionType, TigrisDataTypes, TigrisSchema } from "../../../../types";

export interface Identity {
	connection: string;
	isSocial: boolean;
	provider: string;
	user_id: string;
}

export const identitySchema: TigrisSchema<Identity> = {
	connection: {
		type: TigrisDataTypes.STRING,
	},
	isSocial: {
		type: TigrisDataTypes.BOOLEAN,
	},
	provider: {
		type: TigrisDataTypes.STRING,
	},
	user_id: {
		type: TigrisDataTypes.STRING,
	},
};

export interface Stat {
	loginsCount: string;
}

export const statSchema: TigrisSchema<Stat> = {
	loginsCount: {
		type: TigrisDataTypes.INT64,
	},
};

export interface User extends TigrisCollectionType {
	created: string;
	email: string;
	identities: Identity;
	name: string;
	picture: string;
	stats: Stat;
	updated: string;
	user_id: string;
}

export const userSchema: TigrisSchema<User> = {
	created: {
		type: TigrisDataTypes.DATE_TIME,
	},
	email: {
		type: TigrisDataTypes.STRING,
	},
	identities: {
		type: TigrisDataTypes.ARRAY,
		items: {
			type: identitySchema,
		},
	},
	name: {
		type: TigrisDataTypes.STRING,
	},
	picture: {
		type: TigrisDataTypes.STRING,
	},
	stats: {
		type: statSchema,
	},
	updated: {
		type: TigrisDataTypes.DATE_TIME,
	},
	user_id: {
		type: TigrisDataTypes.STRING,
		primary_key: {
			order: 1,
		},
	},
};
