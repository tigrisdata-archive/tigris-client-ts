import { Collation } from "./search/types";

export class DatabaseInfo {
	private readonly _name: string;
	private readonly _metadata: DatabaseMetadata;

	constructor(name: string, metadata: DatabaseMetadata) {
		this._name = name;
		this._metadata = metadata;
	}

	public get name(): string {
		return this._name;
	}

	public get metadata(): DatabaseMetadata {
		return this._metadata;
	}
}

export class CollectionInfo {
	private readonly _name: string;
	private readonly _metadata: CollectionMetadata;

	constructor(name: string, metadata: CollectionMetadata) {
		this._name = name;
		this._metadata = metadata;
	}

	get name(): string {
		return this._name;
	}

	get metadata(): CollectionMetadata {
		return this._metadata;
	}
}

export class DatabaseMetadata {}

export class CollectionMetadata {}

export class DatabaseOptions {}

export class CollectionOptions {}

export class DropDatabaseResponse {
	private readonly _status: string;
	private readonly _message: string;

	constructor(status: string, message: string) {
		this._status = status;
		this._message = message;
	}

	get status(): string {
		return this._status;
	}

	get message(): string {
		return this._message;
	}
}

export class DropCollectionResponse {
	private readonly _status: string;
	private readonly _message: string;

	constructor(status: string, message: string) {
		this._status = status;
		this._message = message;
	}

	get status(): string {
		return this._status;
	}

	get message(): string {
		return this._message;
	}
}

export class DatabaseDescription {
	private readonly _db: string;
	private readonly _metadata: DatabaseMetadata;
	private readonly _collectionsDescription: Array<CollectionDescription>;

	constructor(
		db: string,
		metadata: DatabaseMetadata,
		collectionsDescription: Array<CollectionDescription>
	) {
		this._db = db;
		this._metadata = metadata;
		this._collectionsDescription = collectionsDescription;
	}

	get db(): string {
		return this._db;
	}

	get metadata(): DatabaseMetadata {
		return this._metadata;
	}

	get collectionsDescription(): Array<CollectionDescription> {
		return this._collectionsDescription;
	}
}

export class CollectionDescription {
	private readonly _collection: string;
	private readonly _metadata: CollectionMetadata;
	private readonly _schema: string;

	constructor(collection: string, metadata: CollectionMetadata, schema: string) {
		this._collection = collection;
		this._metadata = metadata;
		this._schema = schema;
	}

	get collection(): string {
		return this._collection;
	}

	get metadata(): CollectionMetadata {
		return this._metadata;
	}

	get schema(): string {
		return this._schema;
	}
}

export class TigrisResponse {
	private readonly _status: string;

	constructor(status: string) {
		this._status = status;
	}

	get status(): string {
		return this._status;
	}
}

export class DMLMetadata {
	private readonly _createdAt: Date;
	private readonly _updatedAt: Date;

	constructor(createdAt: Date, updatedAt: Date) {
		this._createdAt = createdAt;
		this._updatedAt = updatedAt;
	}

	get createdAt(): Date {
		return this._createdAt;
	}

	get updatedAt(): Date {
		return this._updatedAt;
	}
}

export class DMLResponse extends TigrisResponse {
	private readonly _metadata: DMLMetadata;

	constructor(status: string, metadata: DMLMetadata) {
		super(status);
		this._metadata = metadata;
	}

	get metadata(): DMLMetadata {
		return this._metadata;
	}
}

export class DeleteResponse extends DMLResponse {
	constructor(status: string, metadata: DMLMetadata) {
		super(status, metadata);
	}
}

export class UpdateResponse extends DMLResponse {
	private readonly _modifiedCount: number;
	constructor(status: string, modifiedCount: number, metadata: DMLMetadata) {
		super(status, metadata);
		this._modifiedCount = modifiedCount;
	}

	get modifiedCount(): number {
		return this._modifiedCount;
	}
}

export class WriteOptions {}

export class DeleteRequestOptions {
	private _collation: Collation;
	private _limit: number;

	constructor(limit: number, collation?: Collation) {
		this._limit = limit;
		this._collation = collation;
	}

	get limit(): number {
		return this._limit;
	}

	set limit(value: number) {
		this._limit = value;
	}

	get collation(): Collation {
		return this._collation;
	}

	set collation(value: Collation) {
		this._collation = value;
	}
}

export class UpdateRequestOptions {
	private _collation: Collation;
	private _limit: number;

	constructor(limit: number, collation?: Collation) {
		this._limit = limit;
		this._collation = collation;
	}

	get limit(): number {
		return this._limit;
	}

	set limit(value: number) {
		this._limit = value;
	}

	get collation(): Collation {
		return this._collation;
	}

	set collation(value: Collation) {
		this._collation = value;
	}
}

export class ReadRequestOptions {
	static DEFAULT_LIMIT = 100;
	static DEFAULT_SKIP = 0;

	private _limit: number;
	private _skip: number;
	private _offset: string;
	private _collation: Collation;

	constructor(limit?: number);
	constructor(limit: number, skip: number);
	constructor(limit?: number, skip?: number, offset?: string);
	constructor(limit?: number, skip?: number, offset?: string, collation?: Collation) {
		this._limit = limit ?? ReadRequestOptions.DEFAULT_LIMIT;
		this._skip = skip ?? ReadRequestOptions.DEFAULT_SKIP;
		this._offset = offset;
		this._collation = collation;
	}

	get limit(): number {
		return this._limit;
	}

	set limit(value: number) {
		this._limit = value;
	}

	get skip(): number {
		return this._skip;
	}

	set skip(value: number) {
		this._skip = value;
	}

	get offset(): string {
		return this._offset;
	}

	set offset(value: string) {
		this._offset = value;
	}

	get collation(): Collation {
		return this._collation;
	}

	set collation(value: Collation) {
		this._collation = value;
	}
}

export class TransactionOptions {}

export class StreamEvent<T> {
	private readonly _txId: string;
	private readonly _collection: string;
	private readonly _op: string;
	private readonly _data: T;
	private readonly _last: boolean;

	constructor(txId: string, collection: string, op: string, data: T, last: boolean) {
		this._txId = txId;
		this._collection = collection;
		this._op = op;
		this._data = data;
		this._last = last;
	}

	get txId(): string {
		return this._txId;
	}

	get collection(): string {
		return this._collection;
	}

	get op(): string {
		return this._op;
	}

	get data(): T {
		return this._data;
	}

	get last(): boolean {
		return this._last;
	}
}

export class CommitTransactionResponse extends TigrisResponse {
	constructor(status: string) {
		super(status);
	}
}

export class RollbackTransactionResponse extends TigrisResponse {
	public constructor(status: string) {
		super(status);
	}
}

export class TransactionResponse extends TigrisResponse {
	constructor(status: string) {
		super(status);
	}
}

export class PublishOptions {
	private _partition: number;

	constructor(partition: number) {
		this._partition = partition;
	}

	get partition(): number {
		return this._partition;
	}

	set partition(value: number) {
		this._partition = value;
	}
}

export class SubscribeOptions {
	private _partitions: Array<number>;

	constructor(partitions: Array<number>) {
		this._partitions = partitions;
	}

	get partitions(): Array<number> {
		return this._partitions;
	}

	set partitions(value: Array<number>) {
		this._partitions = value;
	}
}

export class ServerMetadata {
	private readonly _serverVersion: string;

	constructor(serverVersion: string) {
		this._serverVersion = serverVersion;
	}

	get serverVersion(): string {
		return this._serverVersion;
	}
}

// Marker interface
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TigrisCollectionType {}

// Marker interface
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TigrisTopicType extends TigrisCollectionType {}

export enum CollectionType {
	DOCUMENTS = "documents",
	MESSAGES = "messages",
}

export enum LogicalOperator {
	AND = "$and",
	OR = "$or",
}

export enum SelectorFilterOperator {
	EQ = "$eq",
	LT = "$lt",
	LTE = "$lte",
	GT = "$gt",
	GTE = "$gte",
	NONE = "$none",
}

export enum UpdateFieldsOperator {
	SET = "$set",
}

export type FieldTypes = string | number | boolean | bigint | BigInteger;

export type LogicalFilter<T> = {
	op: LogicalOperator;
	selectorFilters?: Array<SelectorFilter<T> | Selector<T>>;
	logicalFilters?: Array<LogicalFilter<T>>;
};

export type ReadFields = {
	include?: Array<string>;
	exclude?: Array<string>;
};

export type UpdateFields = {
	op: UpdateFieldsOperator;
	fields: SimpleUpdateField;
};
export type SimpleUpdateField = {
	[key: string]: FieldTypes | undefined;
};

export enum TigrisDataTypes {
	STRING = "string",
	BOOLEAN = "boolean",
	INT32 = "int32",
	/**
	 * Due to Javascript's limitation if you want to use int64 with values greater than 53bits
	 * then use bigint or string in your model (data container interface) schema will still say
	 * INT64. If you are using default serializer/deserializer
	 * in your application use it as `string`. server will still keep it as `int64`.
	 *
	 * If you have no serde else where in the app or all the serde are handling bigint properly
	 * then use bigint.
	 */
	INT64 = "int64",
	NUMBER = "number",
	NUMBER_BIGINT = "bigint",
	DATE_TIME = "date-time",
	BYTE_STRING = "byte-string",
	UUID = "uuid",
	ARRAY = "array",
	OBJECT = "object",
}

export type TigrisSchema<T> = {
	[K in keyof T]: {
		type: TigrisDataTypes | TigrisSchema<unknown>;
		primary_key?: TigrisPrimaryKey;
		items?: TigrisArrayItem;
	};
};

export type TigrisArrayItem = {
	type: TigrisDataTypes | TigrisSchema<unknown>;
	items?: TigrisArrayItem | TigrisDataTypes;
};

export type TigrisPrimaryKey = {
	order: number;
	autoGenerate?: boolean;
};

/**
Generates all possible paths for type parameter T. By recursively iterating over its keys. While
 iterating the keys it makes the keys available in string form and in non string form both. For
 example

 interface IUser {
  name: string;
  id: number
  address: Address;
 }

 interface Address {
  city: string
  state: string
 }

 and Paths<IUser> will make these keys available
 name, id, address (object type) and also in the string form
 "name", "id", "address.city", "address.state"

 */
type Paths<T, P extends string = ""> = {
	[K in keyof T]: T[K] extends object
		? T[K] extends unknown[]
			? `${P}${K & string}`
			: Paths<T[K], `${P}${K & string}.`> extends infer O
			? `${O & string}` | `${P}${K & string}`
			: never
		: `${P}${K & string}`;
}[keyof T];

/**
 * This type helps to infer the type of the path that Paths (above) has generated.
 */
type PathType<T, P extends string> = P extends keyof T
	? T[P]
	: P extends `${infer L}.${infer R}`
	? L extends keyof T
		? PathType<T[L], R>
		: never
	: never;

export type Selector<T> = Partial<{
	[K in Paths<T>]: Partial<PathType<T, K & string>>;
}>;

export type SelectorFilter<T> = Partial<{
	op?: SelectorFilterOperator;
	fields: Selector<T>;
}>;

export type Filter<T> = SelectorFilter<T> | LogicalFilter<T> | Selector<T>;
