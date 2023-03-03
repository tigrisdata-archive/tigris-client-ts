import { TigrisArrayItem, TigrisDataTypes, TigrisResponse } from "../types";

import { Utility } from "../utility";
import {
	DeleteIndexResponse as ProtoDeleteIndexResponse,
	DocStatus as ProtoDocStatus,
	IndexInfo as ProtoIndexInfo,
} from "../proto/server/v1/search_pb";
import { Status } from "../constants";
import { TigrisError } from "../error";

export type SearchFieldOptions = {
	searchIndex?: boolean;
	sort?: boolean;
	facet?: boolean;
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

	static from(info: ProtoIndexInfo): IndexInfo {
		const schema = info.getSchema()
			? JSON.parse(Utility._base64Decode(info.getSchema_asB64()))
			: {};
		return new this(info.getName(), schema);
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

	static from(resp: ProtoDeleteIndexResponse): DeleteIndexResponse {
		return new this(resp.getMessage());
	}
}

export class DocStatus {
	private readonly _id: string;
	private readonly _error?: TigrisError;

	constructor(id: string, error: TigrisError) {
		this._id = id;
		this._error = error;
	}

	static from(protoStatus: ProtoDocStatus): DocStatus {
		const err = protoStatus.hasError()
			? new TigrisError(protoStatus.getError().getMessage())
			: undefined;
		return new this(protoStatus.getId(), err);
	}

	get id(): string {
		return this._id;
	}

	get error(): TigrisError {
		return this._error;
	}
}
