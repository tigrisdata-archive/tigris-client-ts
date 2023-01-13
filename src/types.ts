import { Collation } from "./search/types";
import {
	CreateBranchResponse as ProtoCreateBranchResponse,
	DeleteBranchResponse as ProtoDeleteBranchResponse,
} from "./proto/server/v1/api_pb";

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

export class TigrisResponse {
	private readonly _status: string;

	constructor(status: string) {
		this._status = status;
	}

	get status(): string {
		return this._status;
	}
}

export class DropDatabaseResponse extends TigrisResponse {
	private readonly _message: string;

	constructor(status: string, message: string) {
		super(status);
		this._message = message;
	}

	get message(): string {
		return this._message;
	}
}

export class CreateBranchResponse extends TigrisResponse {
	private readonly _message: string;

	constructor(status: string, message: string) {
		super(status);
		this._message = message;
	}

	get message(): string {
		return this._message;
	}

	static from(response: ProtoCreateBranchResponse): CreateBranchResponse {
		return new this(response.getStatus(), response.getMessage());
	}
}

export class DeleteBranchResponse extends TigrisResponse {
	private readonly _message: string;
	constructor(status: string, message: string) {
		super(status);
		this._message = message;
	}

	get message(): string {
		return this._message;
	}

	static from(response: ProtoDeleteBranchResponse): DeleteBranchResponse {
		return new this(response.getStatus(), response.getMessage());
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
	private readonly _metadata: DatabaseMetadata;
	private readonly _collectionsDescription: ReadonlyArray<CollectionDescription>;
	private readonly _branches: ReadonlyArray<string>;

	constructor(
		metadata: DatabaseMetadata,
		collectionsDescription: Array<CollectionDescription>,
		branches: Array<string>
	) {
		this._metadata = metadata;
		this._collectionsDescription = collectionsDescription;
		this._branches = branches;
	}

	get metadata(): DatabaseMetadata {
		return this._metadata;
	}

	get collectionsDescription(): ReadonlyArray<CollectionDescription> {
		return this._collectionsDescription;
	}

	get branches(): ReadonlyArray<string> {
		return this._branches;
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

export class DeleteQueryOptions {
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

export class UpdateQueryOptions {
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

export class FindQueryOptions {
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
		this._limit = limit ?? FindQueryOptions.DEFAULT_LIMIT;
		this._skip = skip ?? FindQueryOptions.DEFAULT_SKIP;
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

export class CacheMetadata {
	private readonly _name: string;

	constructor(name: string) {
		this._name = name;
	}

	get name(): string {
		return this._name;
	}
}
export class ListCachesResponse {
	private readonly _caches: CacheMetadata[];

	constructor(caches: CacheMetadata[]) {
		this._caches = caches;
	}

	get caches(): CacheMetadata[] {
		return this._caches;
	}
}

export class DeleteCacheResponse extends TigrisResponse {
	private readonly _message: string;

	constructor(status: string, message: string) {
		super(status);
		this._message = message;
	}

	get message(): string {
		return this._message;
	}
}

export class CacheSetResponse extends TigrisResponse {
	private readonly _message: string;

	constructor(status: string, message: string) {
		super(status);
		this._message = message;
	}

	get message(): string {
		return this._message;
	}
}

export class CacheGetSetResponse extends CacheSetResponse {
	private readonly _old_value: object;

	constructor(status: string, message: string, old_value?: object) {
		super(status, message);
		if (old_value !== undefined) {
			this._old_value = old_value;
		}
	}

	get old_value(): object {
		return this._old_value;
	}
}

export class CacheDelResponse extends TigrisResponse {
	private readonly _message: string;

	constructor(status: string, message: string) {
		super(status);
		this._message = message;
	}

	get message(): string {
		return this._message;
	}
}

export interface CacheSetOptions {
	// optional ttl in seconds
	ex?: number;
	// optional ttl in ms
	px?: number;
	// only set if key doesn't exist
	nx?: boolean;
	// only set if key exists
	xx?: boolean;
}

export class CacheGetResponse {
	private readonly _value: object;

	constructor(value: object) {
		this._value = value;
	}

	get value(): object {
		return this._value;
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

/**
 * Query builder for reading documents from a collection
 * @public
 */
export interface FindQuery<T> {
	/**
	 * Filter to match the documents. Query will match all documents without a filter.
	 */
	filter?: Filter<T>;

	/**
	 * Field projection to allow returning only specific document fields. By default
	 * all document fields are returned.
	 */
	readFields?: ReadFields;
	/**
	 * Optional params
	 */
	options?: FindQueryOptions;
}

/**
 * Query builder for deleting documents from a collection
 * @public
 */
export interface DeleteQuery<T> {
	/**
	 * Filter to match the documents
	 */
	filter: Filter<T>;

	/**
	 * Optional params
	 */
	options?: DeleteQueryOptions;
}

/**
 * Query builder for updating documents in a collection
 * @public
 */
export interface UpdateQuery<T> {
	/**
	 * Filter to match the documents
	 */
	filter: Filter<T>;

	/**
	 * Document fields to update and the update operation
	 */
	fields: UpdateFields | SimpleUpdateField;

	/**
	 * Optional params
	 */
	options?: UpdateQueryOptions;
}

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

/**
 * DB generated values for the schema fields
 */
export enum Generated {
	NOW = "now()",
	CUID = "cuid()",
	UUID = "uuid()",
}

export type AutoTimestamp = "createdAt" | "updatedAt";

export type TigrisFieldOptions = {
	/**
	 * Max length for "string" type of fields
	 */
	maxLength?: number;
	/**
	 * Default value for the schema field
	 */
	default?:
		| Generated
		| number
		| bigint
		| string
		| boolean
		| Date
		| Array<unknown>
		| Record<string, unknown>;

	/**
	 * Let DB generate values for `Date` type of fields
	 */
	timestamp?: AutoTimestamp;
};

export type TigrisSchema<T extends TigrisCollectionType> = {
	[K in keyof T]: {
		type: TigrisDataTypes | TigrisSchema<unknown>;
		primary_key?: PrimaryKeyOptions;
		items?: TigrisArrayItem;
	} & TigrisFieldOptions;
};

export type TigrisArrayItem = {
	type: TigrisDataTypes | TigrisSchema<unknown>;
	items?: TigrisArrayItem | TigrisDataTypes;
};

export type PrimaryKeyOptions = {
	order: number;
	autoGenerate?: boolean;
};

/**
 * Generates all possible paths for type parameter T. By recursively iterating over its keys. While
 * iterating the keys it makes the keys available in string form and in non string form both. For
 * @example
 * ```
 * interface IUser {
 * 		name: string;
 * 		id: number;
 * 		address: Address;
 * }
 *
 * interface Address {
 * 		city: string
 *		state: string
 * }
 * ```
 * and Paths<IUser> will make these keys available name, id, address (object type) and also in the
 * string form "name", "id", "address.city", "address.state"
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

export type LogicalFilter<T> = {
	op: LogicalOperator;
	selectorFilters?: Array<SelectorFilter<T> | Selector<T>>;
	logicalFilters?: Array<LogicalFilter<T>>;
};

export type Filter<T> = SelectorFilter<T> | LogicalFilter<T> | Selector<T>;
