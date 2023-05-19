import {
	CollectionInfo,
	CollectionOptions,
	CommitTransactionResponse,
	CreateBranchResponse,
	DatabaseDescription,
	DeleteBranchResponse,
	DropCollectionResponse,
	TigrisCollectionType,
	TigrisSchema,
	TransactionOptions,
	TransactionResponse,
	Session,
} from "./types";
import { Collection } from "./collection";
import { Utility } from "./utility";
import { TigrisClientConfig } from "./tigris";
import { DecoratedSchemaProcessor } from "./schema/decorated-schema-processor";
import { Log } from "./utils/logger";
import { DecoratorMetaStorage } from "./decorators/metadata/decorator-meta-storage";
import { getDecoratorMetaStorage } from "./globals";
import { CollectionNotFoundError, BranchNameRequiredError, TigrisError } from "./error";
import Driver, { DatabaseDriver } from "./driver/driver";

const DefaultBranch = "main";

/**
 * Tigris Database class to manage database branches, collections and execute
 * transactions.
 */
export class DB {
	private readonly _name: string;
	private readonly _branch: string;
	private readonly driver: Driver;
	private readonly config: TigrisClientConfig;
	private readonly schemaProcessor: DecoratedSchemaProcessor;
	private readonly _metadataStorage: DecoratorMetaStorage;
	private readonly dbDriver: DatabaseDriver;

	/**
	 * Create an instance of Tigris Database class.
	 *
	 * @example Recommended way to create instance using {@link TigrisClient.getDatabase}
	 * ```
	 * const client = new TigrisClient();
	 * const db = client.getDatabase();
	 * ```
	 */
	constructor(db: string, driver: Driver, config: TigrisClientConfig) {
		this._name = db;
		this.driver = driver;
		this.dbDriver = driver.database();
		this.config = config;
		this.schemaProcessor = DecoratedSchemaProcessor.Instance;
		this._metadataStorage = getDecoratorMetaStorage();
		this._branch = Utility.branchNameFromEnv(config.branch);
		if (!this._branch) {
			throw new BranchNameRequiredError();
		}
	}

	/**
	 * Create a new collection if not exists. Else, apply schema changes, if any.
	 *
	 * @param cls - A Class decorated by {@link TigrisCollection}
	 *
	 * @example
	 *
	 * ```
	 * @TigrisCollection("todoItems")
	 * class TodoItem {
	 *   @PrimaryKey(TigrisDataTypes.INT32, { order: 1 })
	 *   id: number;
	 *
	 *   @Field()
	 *   text: string;
	 *
	 *   @Field()
	 *   completed: boolean;
	 * }
	 *
	 * await db.createOrUpdateCollection<TodoItem>(TodoItem);
	 * ```
	 */
	public createOrUpdateCollection<T extends TigrisCollectionType>(
		cls: new () => TigrisCollectionType
	): Promise<Collection<T>>;

	/**
	 * Create a new collection if not exists. Else, apply schema changes, if any.
	 *
	 * @param collectionName - Name of the Tigris Collection
	 * @param schema - Collection's data model
	 *
	 * @example
	 *
	 * ```
	 * const TodoItemSchema: TigrisSchema<TodoItem> = {
	 *   id: {
	 *     type: TigrisDataTypes.INT32,
	 *     primary_key: { order: 1, autoGenerate: true }
	 *   },
	 *   text: { type: TigrisDataTypes.STRING },
	 *   completed: { type: TigrisDataTypes.BOOLEAN }
	 * };
	 *
	 * await db.createOrUpdateCollection<TodoItem>("todoItems", TodoItemSchema);
	 * ```
	 */
	public createOrUpdateCollection<T extends TigrisCollectionType>(
		collectionName: string,
		schema: TigrisSchema<T>
	): Promise<Collection<T>>;

	public createOrUpdateCollection<T extends TigrisCollectionType>(
		nameOrClass: string | TigrisCollectionType,
		schema?: TigrisSchema<T>
	) {
		let collectionName: string;
		if (typeof nameOrClass === "string") {
			collectionName = nameOrClass as string;
		} else {
			const generatedColl = this.schemaProcessor.processCollection(
				nameOrClass as new () => TigrisCollectionType
			);
			collectionName = generatedColl.name;
			schema = generatedColl.schema as TigrisSchema<T>;
		}
		return this.createOrUpdate(
			collectionName,
			schema,
			() =>
				new Collection(
					collectionName,
					this._name,
					this.branch,
					this.driver.search(),
					this.driver.collection<T>(),
					this.config
				)
		);
	}

	private async createOrUpdate<T extends TigrisCollectionType, R>(
		name: string,
		schema: TigrisSchema<T>,
		resolver: () => R
	): Promise<R> {
		const rawJSONSchema: string = Utility._collectionSchematoJSON(name, schema);

		Log.event(`Creating collection: '${name}' in project: '${this._name}'`);
		await this.dbDriver.createOrUpdateCollection(
			this._name,
			this._branch,
			name,
			false,
			rawJSONSchema
		);

		return resolver();
	}

	public listCollections(options?: CollectionOptions): Promise<CollectionInfo[]> {
		return this.dbDriver.listCollections(this.name, this.branch, options);
	}

	/**
	 * Drops a {@link Collection}
	 *
	 * @param cls - A Class decorated by {@link TigrisCollection}
	 */
	public dropCollection(cls: new () => TigrisCollectionType): Promise<DropCollectionResponse>;
	/**
	 * Drops a {@link Collection}
	 *
	 * @param name - Collection name
	 */
	public dropCollection(name: string): Promise<DropCollectionResponse>;

	public dropCollection(
		nameOrClass: TigrisCollectionType | string
	): Promise<DropCollectionResponse> {
		const collectionName = this.resolveNameFromCollectionClass(nameOrClass);
		return this.dbDriver.dropCollection(this.name, this.branch, collectionName);
	}

	public async dropAllCollections(): Promise<PromiseSettledResult<DropCollectionResponse>[]> {
		const collections = await this.listCollections();
		const dropPromises = collections.map((coll) => {
			return this.dropCollection(coll.name);
		});
		return Promise.allSettled(dropPromises);
	}

	public describe(): Promise<DatabaseDescription> {
		return this.dbDriver.describe(this.name, this.branch);
	}

	/**
	 * Gets a {@link Collection} object
	 *
	 * @param cls - A Class decorated by {@link TigrisCollection}
	 */
	public getCollection<T extends TigrisCollectionType>(
		cls: new () => TigrisCollectionType
	): Collection<T>;

	/**
	 * Gets a {@link Collection} object
	 *
	 * @param name - Collection name
	 */
	public getCollection<T extends TigrisCollectionType>(name: string): Collection<T>;

	public getCollection<T extends TigrisCollectionType>(nameOrClass: T | string): Collection<T> {
		const collectionName = this.resolveNameFromCollectionClass(nameOrClass);
		return new Collection<T>(
			collectionName,
			this.name,
			this.branch,
			this.driver.search(),
			this.driver.collection<T>(),
			this.config
		);
	}

	private resolveNameFromCollectionClass(nameOrClass: TigrisCollectionType | string) {
		let collectionName: string;
		if (typeof nameOrClass === "string") {
			collectionName = nameOrClass;
		} else {
			const coll = this._metadataStorage.getCollectionByTarget(
				nameOrClass as new () => TigrisCollectionType
			);
			if (!coll) {
				throw new CollectionNotFoundError(nameOrClass.toString());
			}
			collectionName = coll.collectionName;
		}
		return collectionName;
	}

	public transact(fn: (tx: Session) => void): Promise<TransactionResponse> {
		return new Promise<TransactionResponse>((resolve, reject) => {
			this.beginTransaction()
				.then(async (session) => {
					// tx started
					try {
						// invoke user code
						await fn(session);
						// user code successful
						const commitResponse: CommitTransactionResponse = await session.commit();
						if (commitResponse) {
							resolve(new TransactionResponse());
						}
					} catch (error) {
						// failed to run user code
						await session.rollback();
						// pass error to user
						reject(error);
					}
				})
				.catch((error) => reject(error));
		});
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	public beginTransaction(_options?: TransactionOptions): Promise<Session> {
		return this.dbDriver.beginTransaction(this.name, this.branch, _options);
	}

	public createBranch(name: string): Promise<CreateBranchResponse> {
		return this.dbDriver.createBranch(this.name, name);
	}

	public deleteBranch(name: string): Promise<DeleteBranchResponse> {
		return this.dbDriver.deleteBranch(this.name, name);
	}

	/**
	 * Creates a database branch, if not existing already.
	 *
	 * @example
	 * ```
	 * const client = new TigrisClient();
	 * const db = client.getDatabase();
	 * await db.initializeBranch();
	 * ```
	 *
	 * @throws {@link Promise.reject} - Error if branch cannot be created
	 */
	public async initializeBranch(): Promise<void> {
		if (!this.usingDefaultBranch) {
			try {
				await this.createBranch(this.branch);
				Log.event(`Created database branch: '${this.branch}'`);
			} catch (error) {
				if ((error as TigrisError).errMsg) {
					const tError = error as TigrisError;
					Log.event(tError.errMsg);
				} else {
					throw error;
				}
			}
		}
		Log.info(`Using database branch: '${this.branch}'`);
	}

	get name(): string {
		return this._name;
	}

	get branch(): string {
		return this._branch;
	}

	get usingDefaultBranch(): boolean {
		return this.branch === DefaultBranch;
	}
}
