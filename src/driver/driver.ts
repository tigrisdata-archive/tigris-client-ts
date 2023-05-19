import {
	DocStatus,
	IndexInfo,
	IndexedDoc,
	SearchCursor,
	SearchQuery,
	SearchResult,
} from "../search";
import { CacheKeysCursor, GrpcCursor } from "./grpc/consumables/cursor";
import {
	CacheDelResponse,
	CacheGetResponse,
	CacheSetOptions,
	CacheSetResponse,
	DeleteCacheResponse,
	ListCachesResponse,
	CacheGetSetResponse,
	ServerMetadata,
	CollectionOptions,
	CollectionInfo,
	DropCollectionResponse,
	DatabaseDescription,
	TransactionOptions,
	CreateBranchResponse,
	DeleteBranchResponse,
	CollectionDescription,
	TigrisCollectionType,
	UpdateQuery,
	UpdateResponse,
	DeleteQuery,
	DeleteResponse,
	FindQuery,
	Filter,
	ExplainResponse,
	Session,
} from "../types";

export default interface Driver {
	database(): DatabaseDriver;
	collection<T>(): CollectionDriver<T>;
	search(): SearchDriver;
	cache(): CacheDriver;
	observability(): ObservabilityDriver;

	getAccessToken(clientId: string, clientSecret: string): Promise<string>;
	health(): Promise<string>;
}

export interface CacheDriver {
	createCache(name: string): Promise<void>;
	deleteCache(name: string): Promise<DeleteCacheResponse>;
	listCaches(): Promise<ListCachesResponse>;
	get(cacheName: string, key: string): Promise<CacheGetResponse>;
	getSet(
		cacheName: string,
		key: string,
		value: string | number | boolean | object
	): Promise<CacheGetSetResponse>;
	del(cacheName: string, key: string): Promise<CacheDelResponse>;
	keys(cacheName: string, pattern?: string): CacheKeysCursor;
	set(
		cacheName: string,
		key: string,
		value: string | number | boolean | object,
		options?: CacheSetOptions
	): Promise<CacheSetResponse>;
}

export interface ObservabilityDriver {
	getInfo(): Promise<ServerMetadata>;
}

export interface SearchDriver {
	createOrUpdateIndex(index: string, schema: Uint8Array): Promise<string>;
	listIndexes(): Promise<IndexInfo[]>;
	deleteIndex(name: string): Promise<string>;

	createMany(name: string, docs: Uint8Array[]): Promise<DocStatus[]>;
	createOrReplaceMany(name: string, docs: Uint8Array[]): Promise<DocStatus[]>;
	deleteMany(name: string, ids: string[]): Promise<DocStatus[]>;
	deleteByQuery(name: string, filter: Uint8Array): Promise<number>;
	getMany<T>(name: string, ids: string[]): Promise<IndexedDoc<T>[]>;
	updateMany(name: string, docs: Uint8Array[]): Promise<DocStatus[]>;
	searchCollection<T>(
		db: string,
		branch: string,
		collectionName: string,
		query: SearchQuery<T>,
		page?: number
	): SearchCursor<T> | Promise<SearchResult<T>>;
	search<T>(
		name: string,
		query: SearchQuery<T>,
		page?: number
	): SearchCursor<T> | Promise<SearchResult<T>>;
}

export interface DatabaseDriver {
	createOrUpdateCollection(
		project: string,
		branch: string,
		coll: string,
		onlyCreate: false,
		schema: string
	): Promise<void>;

	listCollections(
		projectName: string,
		branch: string,
		options?: CollectionOptions
	): Promise<Array<CollectionInfo>>;

	dropCollection(
		project: string,
		branch: string,
		collection: string
	): Promise<DropCollectionResponse>;

	describe(name: string, branch: string): Promise<DatabaseDescription>;
	beginTransaction(name: string, branch: string, _options?: TransactionOptions): Promise<Session>;
	createBranch(name: string, branch: string): Promise<CreateBranchResponse>;
	deleteBranch(name: string, branch: string): Promise<DeleteBranchResponse>;
}

export interface CollectionDriver<T extends TigrisCollectionType> {
	describe(db: string, branch: string, coll: string): Promise<CollectionDescription>;

	insertMany(
		db: string,
		branch: string,
		coll: string,
		createdAtNames: string[],
		docs: T[],
		tx?: Session
	): Promise<T[]>;
	insertOrReplaceMany(
		db: string,
		branch: string,
		coll: string,
		docs: T[],
		tx?: Session
	): Promise<T[]>;

	updateMany(
		db: string,
		branch: string,
		coll: string,
		query: UpdateQuery<T>,
		tx?: Session
	): Promise<UpdateResponse>;

	deleteMany(
		db: string,
		branch: string,
		coll: string,
		query: DeleteQuery<T>,
		tx?: Session
	): Promise<DeleteResponse>;

	findMany(
		db: string,
		branch: string,
		coll: string,
		query: FindQuery<T>,
		tx?: Session
	): GrpcCursor<T>;
	explain(db: string, branch: string, coll: string, query: FindQuery<T>): Promise<ExplainResponse>;
	count(db: string, branch: string, coll: string, filter?: Filter<T>): Promise<number>;
}
