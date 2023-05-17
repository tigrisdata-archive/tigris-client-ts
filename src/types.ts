/* eslint-disable @typescript-eslint/no-empty-interface */
import {
	CreateBranchResponse as ProtoCreateBranchResponse,
	DeleteBranchResponse as ProtoDeleteBranchResponse,
} from "./proto/server/v1/api_pb";
import { Status } from "./constants";
import { Collation } from "./search/query";
import { SearchFieldOptions } from "./search";

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

export interface TigrisResponse {
	status: Status;
	message?: string;
}

export class CreateBranchResponse implements TigrisResponse {
	status: Status = Status.Created;
	private readonly _message: string;

	constructor(message: string) {
		this._message = message;
	}

	get message(): string {
		return this._message;
	}

	static from(response: ProtoCreateBranchResponse): CreateBranchResponse {
		return new this(response.getMessage());
	}
}

export class DeleteBranchResponse implements TigrisResponse {
	status: Status = Status.Deleted;
	private readonly _message: string;
	constructor(message: string) {
		this._message = message;
	}

	get message(): string {
		return this._message;
	}

	static from(response: ProtoDeleteBranchResponse): DeleteBranchResponse {
		return new this(response.getMessage());
	}
}

export class DropCollectionResponse implements TigrisResponse {
	status: Status = Status.Dropped;
	private readonly _message: string;

	constructor(message: string) {
		this._message = message;
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

type IndexState = "INDEX WRITE MODE" | "INDEX ACTIVE";

export type IndexField = {
	name: string;
};

export type IndexDescription = {
	name: string;
	state: IndexState;
	fields?: IndexField[];
};

export class CollectionDescription {
	private readonly _collection: string;
	private readonly _metadata: CollectionMetadata;
	private readonly _schema: string;
	private readonly _indexDescriptions?: IndexDescription[];

	constructor(
		collection: string,
		metadata: CollectionMetadata,
		schema: string,
		indexDescriptions?: IndexDescription[]
	) {
		this._collection = collection;
		this._metadata = metadata;
		this._schema = schema;
		this._indexDescriptions = indexDescriptions;
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

	get indexDescriptions(): IndexDescription[] {
		if (!this._indexDescriptions) {
			return [];
		}

		return this._indexDescriptions;
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

export interface DMLResponse {
	metadata: DMLMetadata;
}

export class DeleteResponse implements TigrisResponse, DMLResponse {
	status: Status = Status.Deleted;
	private readonly _metadata: DMLMetadata;

	constructor(metadata: DMLMetadata) {
		this._metadata = metadata;
	}

	get metadata(): DMLMetadata {
		return this._metadata;
	}
}

export class UpdateResponse implements TigrisResponse, DMLResponse {
	status: Status = Status.Updated;
	private readonly _metadata: DMLMetadata;
	private readonly _modifiedCount: number;

	constructor(modifiedCount: number, metadata: DMLMetadata) {
		this._modifiedCount = modifiedCount;
		this._metadata = metadata;
	}

	get modifiedCount(): number {
		return this._modifiedCount;
	}

	get metadata(): DMLMetadata {
		return this._metadata;
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

export class CommitTransactionResponse implements TigrisResponse {
	status: Status = Status.Ok;
	private readonly _message: string;

	constructor(message: string) {
		this._message = message;
	}

	get message(): string {
		return this._message;
	}
}

export class RollbackTransactionResponse implements TigrisResponse {
	status: Status = Status.Ok;
	private readonly _message: string;

	constructor(message: string) {
		this._message = message;
	}

	get message(): string {
		return this._message;
	}
}

export class TransactionResponse implements TigrisResponse {
	status: Status = Status.Ok;
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

export class DeleteCacheResponse implements TigrisResponse {
	status: Status = Status.Deleted;
	private readonly _message: string;

	constructor(message: string) {
		this._message = message;
	}

	get message(): string {
		return this._message;
	}
}

export class CacheSetResponse implements TigrisResponse {
	status: Status = Status.Set;
	private readonly _message: string;

	constructor(message: string) {
		this._message = message;
	}

	get message(): string {
		return this._message;
	}
}

export class CacheGetSetResponse extends CacheSetResponse {
	private readonly _old_value: object;

	constructor(message: string, old_value?: object) {
		super(message);
		if (old_value !== undefined) {
			this._old_value = old_value;
		}
	}

	get old_value(): object {
		return this._old_value;
	}
}

export class CacheDelResponse implements TigrisResponse {
	status: Status = Status.Deleted;
	private readonly _message: string;

	constructor(status: string, message: string) {
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

// Marker interfaces
export interface TigrisCollectionType {
	// TODO: add a discriminator here
}

export type NumericType = number | bigint;
export type FieldTypes = string | boolean | NumericType | BigInteger | Date | object;

export type ReadFields = {
	include?: Array<string>;
	exclude?: Array<string>;
};

type DocumentFields<T, V> = Partial<{
	[K in Paths<T>]: V;
}>;

export type UpdateFields<T> =
	| {
			$set?: DocumentFields<T, FieldTypes | undefined>;
			$unset?: Partial<Paths<T>>[];
			$increment?: DocumentFields<T, NumericType>;
			$decrement?: DocumentFields<T, NumericType>;
			$multiply?: DocumentFields<T, NumericType>;
			$divide?: DocumentFields<T, NumericType>;
			$push?: DocumentFields<T, FieldTypes | undefined>;
	  }
	| DocumentFields<T, FieldTypes | undefined>;

/**
 * List of fields and their corresponding sort order to order the search results.
 */
export type SortOrder = SortField | Array<SortField>;

/**
 * Collection field name and sort order
 */
export type SortField = {
	field: string;
	order: "$asc" | "$desc";
};

/**
 * Group by fields
 */
export type GroupByField = {
	fields: Array<string>;
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
	 * Sort the query results as per indicated order
	 */
	sort?: SortOrder;

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
	fields: UpdateFields<T>;

	/**
	 * Optional params
	 */
	options?: UpdateQueryOptions;
}

export type ReadType = "primary index" | "secondary index";
/**
 * Explain Response
 *  @public
 */
export interface ExplainResponse {
	/**
	 * Filter used to match the documents
	 */
	filter: string;
	/**
	 * Sets whether the query read from the primary index or a secondary index
	 */
	readType: ReadType;
	/**
	 * The field used to read from the secondary index
	 */
	field?: string;
	/**
	 * The key range used to query the secondary index
	 */
	keyRange?: string[];

	/**
	 * Sort field
	 */
	sort?: string;
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
export enum GeneratedField {
	NOW = "now()",
	CUID = "cuid()",
	UUID = "uuid()",
}

export type AutoTimestamp = "createdAt" | "updatedAt";

export type CollectionFieldOptions = {
	/**
	 * Max length for "string" type of fields
	 */
	maxLength?: number;
	/**
	 * Default value for the schema field
	 */
	default?: GeneratedField | FieldTypes | Array<unknown> | Record<string, unknown>;

	/**
	 * Let DB generate values for `Date` type of fields
	 */
	timestamp?: AutoTimestamp;
	/**
	 * Dimensions for a vector field
	 */
	dimensions?: number;
	/**
	 * Create a secondary index on the field
	 */
	index?: boolean;
};

export type TigrisSchema<T extends TigrisCollectionType> = {
	[K in keyof T]: {
		type: TigrisDataTypes | TigrisSchema<unknown>;
		primary_key?: PrimaryKeyOptions;
		items?: TigrisArrayItem;
	} & CollectionFieldOptions &
		SearchFieldOptions;
};

export type TigrisArrayItem = {
	type: TigrisDataTypes | TigrisSchema<unknown>;
	items?: TigrisArrayItem | TigrisDataTypes;
};

export type PrimaryKeyOptions = {
	order?: number;
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type PathType<T, P extends string> = P extends keyof T
	? T[P]
	: P extends `${infer L}.${infer R}`
	? L extends keyof T
		? PathType<T[L], R>
		: never
	: never;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type Selector<T> = Partial<{
	[K in string]: unknown;
}>;

type PathsForFilter<T, P extends string = ""> = {
	[K in keyof T]: T[K] extends object
		? T[K] extends unknown[]
			? `${P}${K & string}`
			: Paths<T[K], `${P}${K & string}.`> extends infer O
			? T[K] extends Date | BigInt
				? `${O & string}` | `${P}${K & string}`
				: `${O & string}`
			: never
		: `${P}${K & string}`;
}[keyof T];

export type SelectorOperator =
	| "$eq"
	| "$gt"
	| "$gte"
	| "$lt"
	| "$lte"
	| "$not"
	| "$regex"
	| "$contains"
	| "$none";
export type LogicalOperator = "$or" | "$and";

export type SelectorFilter<T> = {
	[K in PathsForFilter<T>]?: PathType<T, K> | { [P in SelectorOperator]?: PathType<T, K> };
};

export type LogicalFilter<T> = {
	[P in LogicalOperator]?: Array<Filter<T>>;
};

export type Filter<T> = SelectorFilter<T> | LogicalFilter<T>;
