import {
	CollectionDescription,
	IterableCursor,
	DeleteQuery,
	DeleteQueryOptions,
	DeleteResponse,
	ExplainResponse,
	Filter,
	FindQuery,
	FindQueryOptions,
	Session,
	TigrisCollectionType,
	UpdateQuery,
	UpdateQueryOptions,
	UpdateResponse,
} from "./types";
import { TigrisClientConfig } from "./tigris";
import { MissingArgumentError } from "./error";
import { SearchCursor, SearchQuery } from "./search";
import { SearchResult } from "./search";
import { DecoratorMetaStorage } from "./decorators/metadata/decorator-meta-storage";
import { getDecoratorMetaStorage } from "./globals";
import { SearchDriver, CollectionDriver } from "./driver/driver";
import { GrpcSession } from "./driver/grpc/session";

interface ICollection {
	readonly collectionName: string;
	readonly db: string;
}

/**
 * The **Collection** class represents Tigris collection allowing insert/find/update/delete/search
 * operations.
 * @public
 */
export class Collection<T extends TigrisCollectionType> implements ICollection {
	readonly collectionName: string;
	readonly db: string;
	readonly branch: string;
	readonly searchDriver: SearchDriver;
	readonly collectionDriver: CollectionDriver<T>;
	readonly config: TigrisClientConfig;
	private readonly _metadataStorage: DecoratorMetaStorage;
	private readonly _collectionCreatedAtFieldNames: string[];

	constructor(
		collectionName: string,
		db: string,
		branch: string,
		searchDriver: SearchDriver,
		collectionDriver: CollectionDriver<T>,
		config: TigrisClientConfig
	) {
		this.collectionName = collectionName;
		this.db = db;
		this.branch = branch;
		this._metadataStorage = getDecoratorMetaStorage();
		this.config = config;
		this.searchDriver = searchDriver;
		this.collectionDriver = collectionDriver;
		this._collectionCreatedAtFieldNames = ((): string[] => {
			const collectionTarget = this._metadataStorage.collections.get(this.collectionName)?.target;
			const collectionFields = this._metadataStorage.getCollectionFieldsByTarget(collectionTarget);
			return collectionFields
				.filter((field) => {
					return field?.schemaFieldOptions?.timestamp === "createdAt";
				})
				.map((f) => f.name);
		})();
	}

	describe(): Promise<CollectionDescription> {
		return this.collectionDriver.describe(this.db, this.branch, this.collectionName);
	}

	/**
	 * Inserts multiple documents in Tigris collection.
	 *
	 * @param docs - Array of documents to insert
	 * @param tx - Session information for transaction context
	 */
	insertMany(docs: Array<T>, tx?: Session): Promise<T[]> {
		return this.collectionDriver.insertMany(
			this.db,
			this.branch,
			this.collectionName,
			this._collectionCreatedAtFieldNames,
			docs,
			tx
		);
	}

	/**
	 * Inserts a single document in Tigris collection.
	 *
	 * @param doc - Document to insert
	 * @param tx - Session information for transaction context
	 */
	insertOne(doc: T, tx?: Session): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			const docArr: Array<T> = [doc];
			this.insertMany(docArr, tx)
				.then((docs) => {
					resolve(docs[0]);
				})
				.catch((error) => {
					reject(error);
				});
		});
	}

	/**
	 * Insert new or replace existing documents in collection.
	 *
	 * @param docs - Array of documents to insert or replace
	 * @param tx - Session information for transaction context
	 */
	insertOrReplaceMany(docs: T[], tx?: Session): Promise<T[]> {
		return this.collectionDriver.insertOrReplaceMany(
			this.db,
			this.branch,
			this.collectionName,
			docs,
			tx
		);
	}

	/**
	 * Insert new or replace an existing document in collection.
	 *
	 * @param doc - Document to insert or replace
	 * @param tx - Session information for transaction context
	 */
	async insertOrReplaceOne(doc: T, tx?: Session): Promise<T> {
		const docs = await this.insertOrReplaceMany([doc], tx);
		return docs[0];
	}

	/**
	 * Update multiple documents in a collection
	 *
	 * @param query - Filter to match documents and the update operations. Update
	 * 								will be applied to matching documents only.
	 * @returns {@link UpdateResponse}
	 *
	 * @example To update **language** of all books published by "Marcel Proust"
	 * ```
	 * const updatePromise = db.getCollection<Book>(Book).updateMany({
	 *   filter: { author: "Marcel Proust" },
	 *   fields: { language: "French" }
	 * });
	 *
	 * updatePromise
	 * 		.then((resp: UpdateResponse) => console.log(resp));
	 * 		.catch( // catch the error)
	 * 		.finally( // finally do something);
	 * ```
	 */
	updateMany(query: UpdateQuery<T>): Promise<UpdateResponse>;

	/**
	 * Update multiple documents in a collection in transactional context
	 *
	 * @param query - Filter to match documents and the update operations. Update
	 * 								will be applied to matching documents only.
	 * @param tx - Session information for transaction context
	 * @returns {@link UpdateResponse}
	 *
	 * @example To update **language** of all books published by "Marcel Proust"
	 * ```
	 * const updatePromise = db.getCollection<Book>(Book).updateMany({
	 *   filter: { author: "Marcel Proust" },
	 *   fields: { language: "French" }
	 * }, tx);
	 *
	 * updatePromise
	 * 		.then((resp: UpdateResponse) => console.log(resp));
	 * 		.catch( // catch the error)
	 * 		.finally( // finally do something);
	 * ```
	 */
	updateMany(query: UpdateQuery<T>, tx: Session): Promise<UpdateResponse>;

	updateMany(query: UpdateQuery<T>, tx?: Session): Promise<UpdateResponse> {
		return this.collectionDriver.updateMany(this.db, this.branch, this.collectionName, query, tx);
	}

	/**
	 * Update a single document in collection
	 *
	 * @param query - Filter to match the document and the update operations. Update
	 * 								will be applied to matching documents only.
	 * @returns {@link UpdateResponse}
	 *
	 * @example To update **language** of a book published by "Marcel Proust"
	 * ```
	 * const updatePromise = db.getCollection<Book>(Book).updateOne({
	 *   filter: { author: "Marcel Proust" },
	 *   fields: { language: "French" }
	 * });
	 *
	 * updatePromise
	 * 		.then((resp: UpdateResponse) => console.log(resp));
	 * 		.catch( // catch the error)
	 * 		.finally( // finally do something);
	 * ```
	 */
	updateOne(query: UpdateQuery<T>): Promise<UpdateResponse>;

	/**
	 * Update a single document in a collection in transactional context
	 *
	 * @param query - Filter to match the document and update operations. Update
	 * 								will be applied to a single matching document only.
	 * @param tx - Session information for transaction context
	 * @returns {@link UpdateResponse}
	 *
	 * @example To update **language** of a book published by "Marcel Proust"
	 * ```
	 * const updatePromise = db.getCollection<Book>(Book).updateOne({
	 *   filter: { author: "Marcel Proust" },
	 *   fields: { language: "French" }
	 * }, tx);
	 *
	 * updatePromise
	 * 		.then((resp: UpdateResponse) => console.log(resp));
	 * 		.catch( // catch the error)
	 * 		.finally( // finally do something);
	 * ```
	 */
	updateOne(query: UpdateQuery<T>, tx: Session): Promise<UpdateResponse>;

	updateOne(query: UpdateQuery<T>, tx?: Session): Promise<UpdateResponse> {
		if (query.options === undefined) {
			query.options = new UpdateQueryOptions(1);
		} else {
			query.options.limit = 1;
		}
		return this.updateMany(query, tx);
	}

	/**
	 * Delete documents from collection matching the query
	 *
	 * @param query - Filter to match documents and other deletion options
	 * @returns {@link DeleteResponse}
	 *
	 * @example
	 *
	 * ```
	 * const deletionPromise = db.getCollection<Book>(Book).deleteMany({
	 * 		filter: { author: "Marcel Proust" }
	 * });
	 *
	 * deletionPromise
	 * 		.then((resp: DeleteResponse) => console.log(resp));
	 * 		.catch( // catch the error)
	 * 		.finally( // finally do something);
	 * ```
	 */
	deleteMany(query: DeleteQuery<T>): Promise<DeleteResponse>;

	/**
	 * Delete documents from collection in transactional context
	 *
	 * @param query - Filter to match documents and other deletion options
	 * @param tx - Session information for transaction context
	 * @returns {@link DeleteResponse}
	 *
	 * @example
	 *
	 * ```
	 * const deletionPromise = db.getCollection<Book>(Book).deleteMany({
	 * 		filter: { author: "Marcel Proust" }
	 * }, tx);
	 *
	 * deletionPromise
	 * 		.then((resp: DeleteResponse) => console.log(resp));
	 * 		.catch( // catch the error)
	 * 		.finally( // finally do something);
	 * ```
	 */
	deleteMany(query: DeleteQuery<T>, tx: Session): Promise<DeleteResponse>;

	deleteMany(query: DeleteQuery<T>, tx?: Session): Promise<DeleteResponse> {
		if (typeof query?.filter === "undefined") {
			throw new MissingArgumentError("filter");
		}

		return this.collectionDriver.deleteMany(this.db, this.branch, this.collectionName, query, tx);
	}

	/**
	 * Delete a single document from collection matching the query
	 *
	 * @param query - Filter to match documents and other deletion options
	 * @returns {@link DeleteResponse}
	 *
	 * @example
	 *
	 * ```
	 * const deletionPromise = db.getCollection<Book>(Book).deleteOne({
	 * 		filter: { author: "Marcel Proust" }
	 * });
	 *
	 * deletionPromise
	 * 		.then((resp: DeleteResponse) => console.log(resp));
	 * 		.catch( // catch the error)
	 * 		.finally( // finally do something);
	 * ```
	 */
	deleteOne(query: DeleteQuery<T>): Promise<DeleteResponse>;

	/**
	 * Delete a single document from collection in transactional context
	 *
	 * @param query - Filter to match documents and other deletion options
	 * @param tx - Session information for transaction context
	 * @returns {@link DeleteResponse}
	 *
	 * @example
	 *
	 * ```
	 * const deletionPromise = db.getCollection<Book>(Book).deleteOne({
	 * 		filter: { author: "Marcel Proust" }
	 * }, tx);
	 *
	 * deletionPromise
	 * 		.then((resp: DeleteResponse) => console.log(resp));
	 * 		.catch( // catch the error)
	 * 		.finally( // finally do something);
	 * ```
	 */
	deleteOne(query: DeleteQuery<T>, tx: Session): Promise<DeleteResponse>;

	deleteOne(query: DeleteQuery<T>, tx?: Session): Promise<DeleteResponse> {
		if (query.options === undefined) {
			query.options = new DeleteQueryOptions(1);
		} else {
			query.options.limit = 1;
		}

		return this.deleteMany(query, tx);
	}

	/**
	 * Read all the documents from a collection.
	 *
	 * @returns - {@link GrpcCursor} to iterate over documents
	 *
	 * @example
	 * ```
	 * const cursor = db.getCollection<Book>(Book).findMany();
	 *
	 * for await (const document of cursor) {
	 *   console.log(document);
	 * }
	 * ```
	 */
	findMany(): IterableCursor<T>;

	/**
	 * Reads all the documents from a collection in transactional context.
	 *
	 * @param tx - Session information for Transaction
	 * @returns - {@link GrpcCursor} to iterate over documents
	 *
	 * @example
	 * ```
	 * const cursor = db.getCollection<Book>(Book).findMany(tx);
	 *
	 * for await (const document of cursor) {
	 *   console.log(document);
	 * }
	 * ```
	 */
	findMany(tx: Session): IterableCursor<T>;

	/**
	 * Performs a read query on collection and returns a cursor that can be used to iterate over
	 * query results.
	 *
	 * @param query - Filter, field projection and other parameters
	 * @returns - {@link GrpcCursor} to iterate over documents
	 *
	 * @example
	 * ```
	 * const cursor = db.getCollection<Book>(Book).findMany({
	 * 		filter: { author: "Marcel Proust" },
	 * 		readFields: { include: ["id", "title"] }
	 * });
	 *
	 * for await (const document of cursor) {
	 *   console.log(document);
	 * }
	 * ```
	 */
	findMany(query: FindQuery<T>): IterableCursor<T>;

	/**
	 * Performs a read query on collection in transactional context and returns a
	 * cursor that can be used to iterate over query results.
	 *
	 * @param query - Filter, field projection and other parameters
	 * @param tx - Session information for Transaction
	 * @returns - {@link GrpcCursor} to iterate over documents
	 *
	 * @example
	 * ```
	 * const cursor = db.getCollection<Book>(Book).findMany({
	 * 		filter: { author: "Marcel Proust" },
	 * 		readFields: { include: ["id", "title"] }
	 * }, tx);
	 *
	 * for await (const document of cursor) {
	 *   console.log(document);
	 * }
	 * ```
	 */
	findMany(query: FindQuery<T>, tx: Session): IterableCursor<T>;

	findMany(txOrQuery?: Session | FindQuery<T>, tx?: Session): IterableCursor<T> {
		let query: FindQuery<T>;
		if (typeof txOrQuery !== "undefined") {
			if (this.isTxSession(txOrQuery)) {
				tx = txOrQuery as Session;
			} else {
				query = txOrQuery as FindQuery<T>;
			}
		}

		const findAll: Filter<T> = {};

		if (!query) {
			query = { filter: findAll };
		} else if (!query.filter) {
			query.filter = findAll;
		}

		return this.collectionDriver.findMany(this.db, this.branch, this.collectionName, query, tx);
	}

	/**
	 * Returns a explain response on how Tigris would process a query
	 *
	 * @returns - The explain response
	 *
	 * @example
	 * ```
	 * 	const explain = await db.getCollection<Book>(Book).explain({"author": "Brandon Sanderson"});
	 *	console.log(`Read Type: ${explain.readType}, Key Ranges: ${explain.KeyRange}, field: ${explain.field}`)
	 *
	 * ```
	 */
	explain(query: FindQuery<T>): Promise<ExplainResponse> {
		return this.collectionDriver.explain(this.db, this.branch, this.collectionName, query);
	}

	/**
	 * Count the number of documents in a collection
	 * @returns - the number of documents in a collection
	 *
	 * @example
	 * ```
	 * const countPromise = db.getCollection<Book>(Book).count();
	 *
	 * countPromise
	 * 		.then(count: number) => console.log(count);
	 * 		.catch( // catch the error)
	 * 		.finally( // finally do something)
	 * ```
	 */
	count(filter?: Filter<T>): Promise<number> {
		return this.collectionDriver.count(this.db, this.branch, this.collectionName, filter);
	}

	/**
	 * Read a single document from collection.
	 *
	 * @returns - The document if found else **undefined**
	 *
	 * @example
	 * ```
	 * const documentPromise = db.getCollection<Book>(Book).findOne();
	 *
	 * documentPromise
	 * 		.then((doc: Book | undefined) => console.log(doc));
	 * 		.catch( // catch the error)
	 * 		.finally( // finally do something);
	 * ```
	 */
	findOne(): Promise<T | undefined>;

	/**
	 * Read a single document from collection in transactional context
	 *
	 * @param tx - Session information for Transaction
	 * @returns - The document if found else **undefined**
	 *
	 * @example
	 * ```
	 * const documentPromise = db.getCollection<Book>(Book).findOne(tx);
	 *
	 * documentPromise
	 * 		.then((doc: Book | undefined) => console.log(doc));
	 * 		.catch( // catch the error)
	 * 		.finally( // finally do something);
	 * ```
	 */
	findOne(tx: Session): Promise<T | undefined>;

	/**
	 * Performs a read query on the collection and returns a single document matching
	 * the query.
	 *
	 * @param query - Filter, field projection and other parameters
	 * @returns - The document if found else **undefined**
	 *
	 * @example
	 * ```
	 * const documentPromise = db.getCollection<Book>(Book).findOne({
	 * 		filter: { author: "Marcel Proust" },
	 * 		readFields: { include: ["id", "title"] }
	 * });
	 *
	 * documentPromise
	 * 		.then((doc: Book | undefined) => console.log(doc));
	 * 		.catch( // catch the error)
	 * 		.finally( // finally do something);
	 * ```
	 */
	findOne(query: FindQuery<T>): Promise<T | undefined>;

	/**
	 * Performs a read query on the collection in transactional context and returns
	 * a single document matching the query.
	 *
	 * @param query - Filter, field projection and other parameters
	 * @param tx - Session information for Transaction
	 * @returns - The document if found else **undefined**
	 *
	 * @example
	 * ```
	 * const documentPromise = db.getCollection<Book>(Book).findOne({
	 * 		filter: { author: "Marcel Proust" },
	 * 		readFields: { include: ["id", "title"] }
	 * }, tx);
	 *
	 * documentPromise
	 * 		.then((doc: Book | undefined) => console.log(doc));
	 * 		.catch( // catch the error)
	 * 		.finally( // finally do something);
	 * ```
	 */
	findOne(query: FindQuery<T>, tx: Session): Promise<T | undefined>;

	async findOne(txOrQuery?: Session | FindQuery<T>, tx?: Session): Promise<T | undefined> {
		let query: FindQuery<T>;
		if (typeof txOrQuery !== "undefined") {
			if (this.isTxSession(txOrQuery)) {
				tx = txOrQuery as Session;
			} else {
				query = txOrQuery as FindQuery<T>;
			}
		}

		const findOnlyOne: FindQueryOptions = new FindQueryOptions(1);

		if (!query) {
			query = { options: findOnlyOne };
		} else if (!query.options) {
			query.options = findOnlyOne;
		} else {
			query.options.limit = findOnlyOne.limit;
		}

		const cursor = this.findMany(query, tx);
		const iteratorResult = await cursor[Symbol.asyncIterator]().next();

		return iteratorResult?.value;
	}

	/**
	 * Search for documents in a collection. Easily perform sophisticated queries and refine
	 * results using filters with advanced features like faceting and ordering.
	 *
	 * @param query - Search query to execute
	 * @returns {@link SearchIterator} - To iterate over pages of {@link SearchResult}
	 *
	 * @example
	 * ```
	 * const iterator = db.getCollection<Book>(Book).search(query);
	 *
	 * for await (const resultPage of iterator) {
	 *   console.log(resultPage.hits);
	 *   console.log(resultPage.facets);
	 * }
	 * ```
	 */
	search(query: SearchQuery<T>): SearchCursor<T>;

	/**
	 * Search for documents in a collection. Easily perform sophisticated queries and refine
	 * results using filters with advanced features like faceting and ordering.
	 *
	 * @param query - Search query to execute
	 * @param page - Page number to retrieve. Page number `1` fetches the first page of search results.
	 * @returns - Single page of results wrapped in a Promise
	 *
	 * @example To retrieve page number 5 of matched documents
	 * ```
	 * const resultPromise = db.getCollection<Book>(Book).search(query, 5);
	 *
	 * resultPromise
	 * 		.then((res: SearchResult<Book>) => console.log(res.hits))
	 * 		.catch( // catch the error)
	 * 		.finally( // finally do something);
	 *
	 * ```
	 */
	search(query: SearchQuery<T>, page: number): Promise<SearchResult<T>>;

	search(query: SearchQuery<T>, page?: number): SearchCursor<T> | Promise<SearchResult<T>> {
		return this.searchDriver.searchCollection(
			this.db,
			this.branch,
			this.collectionName,
			query,
			page
		);
	}

	private isTxSession(txOrQuery: Session | unknown): txOrQuery is Session {
		const mayBeTx = txOrQuery as Session;
		// TODO: FIx GrpcSession
		return "id" in mayBeTx && mayBeTx instanceof GrpcSession;
	}
}
