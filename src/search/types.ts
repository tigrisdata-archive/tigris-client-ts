import { TigrisArrayItem, TigrisDataTypes, TigrisResponse } from "../types";

import { Utility } from "../utility";
import { Status } from "../constants";
import { TigrisError } from "../error";

export type SearchFieldOptions = {
	searchIndex?: boolean;
	sort?: boolean;
	facet?: boolean;
	dimensions?: number;
	id?: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TigrisIndexType {}
export type TigrisIndexSchema<T extends TigrisIndexType> = {
	[K in keyof T]: {
		type: TigrisDataTypes | TigrisIndexSchema<unknown>;
		items?: TigrisArrayItem;
	} & SearchFieldOptions;
};

export class IndexInfo {
	private readonly _name: string;
	private readonly _schema: object;

	constructor(name, schema) {
		this._name = name;
		this._schema = schema;
	}

	static from(name: string, schemaAsB64: string): IndexInfo {
		const schema = schemaAsB64 ? JSON.parse(Utility._base64Decode(schemaAsB64)) : {};
		return new this(name, schema);
	}

	get name(): string {
		return this._name;
	}

	get schema(): object {
		return this._schema;
	}
}

export class DeleteIndexResponse implements TigrisResponse {
	status: Status = Status.Deleted;
	private readonly _message: string;
	constructor(message: string) {
		this._message = message;
	}

	get message(): string {
		return this._message;
	}
}

export class DocStatus {
	readonly id: string;
	readonly error?: TigrisError;

	constructor(id: string, error: TigrisError) {
		this.id = id;
		this.error = error;
	}
}
