import { TigrisClient } from "./proto/server/v1/api_grpc_pb";
import {
	CollectionDescription,
	CollectionInfo,
	CollectionMetadata,
	CollectionOptions,
	CommitTransactionResponse,
	CreateBranchResponse,
	DatabaseDescription,
	DatabaseMetadata,
	DeleteBranchResponse,
	DropCollectionResponse,
	TigrisCollectionType,
	TigrisSchema,
	TransactionOptions,
	TransactionResponse,
} from "./types";
import {
	BeginTransactionRequest as ProtoBeginTransactionRequest,
	BeginTransactionResponse,
	CollectionOptions as ProtoCollectionOptions,
	CreateBranchRequest as ProtoCreateBranchRequest,
	CreateOrUpdateCollectionRequest as ProtoCreateOrUpdateCollectionRequest,
	DeleteBranchRequest as ProtoDeleteBranchRequest,
	DescribeDatabaseRequest as ProtoDescribeDatabaseRequest,
	DropCollectionRequest as ProtoDropCollectionRequest,
	ListCollectionsRequest as ProtoListCollectionsRequest,
} from "./proto/server/v1/api_pb";
import { Collection } from "./collection";
import { Session } from "./session";
import { Utility } from "./utility";
import { Metadata, ServiceError } from "@grpc/grpc-js";
import { TigrisClientConfig } from "./tigris";
import { DecoratedSchemaProcessor } from "./schema/decorated-schema-processor";
import { Log } from "./utils/logger";
import { DecoratorMetaStorage } from "./decorators/metadata/decorator-meta-storage";
import { getDecoratorMetaStorage } from "./globals";
import { CollectionNotFoundError, BranchNotFoundError } from "./error";
import { Status } from "@grpc/grpc-js/build/src/constants";

const SetCookie = "Set-Cookie";
const Cookie = "Cookie";
const BeginTransactionMethodName = "/tigrisdata.v1.Tigris/BeginTransaction";

/**
 * A branch name could be dynamically generated from environment variables.
 *
 * @example Simple name "my_database_branch" would translate to:
 * ```
 * {
 *   name: "my_database_branch",
 *   dynamicCreation: false
 * }
 * ```
 *
 * @example A dynamically generated branch name "my_db_$\{GIT_BRANCH\}" would translate to:
 * ```
 * export GIT_BRANCH=feature_1
 * {
 *   name: "my_db_feature_1",
 *   dynamicCreation: true
 * }
 * ```
 */
export type TemplatedBranchName = { name: string; dynamicCreation: boolean };
const DefaultBranch: TemplatedBranchName = { name: "main", dynamicCreation: false };

/**
 * Tigris Database class to manage database branches, collections and execute
 * transactions.
 */
export class DB {
	private readonly _name: string;
	private readonly _branchVar: TemplatedBranchName;
	private readonly grpcClient: TigrisClient;
	private readonly config: TigrisClientConfig;
	private readonly schemaProcessor: DecoratedSchemaProcessor;
	private readonly _metadataStorage: DecoratorMetaStorage;

	/**
	 * Create an instance of Tigris Database class.
	 *
	 * @example Recommended way to create instance using {@link TigrisClient.getDatabase}
	 * ```
	 * const client = new TigrisClient();
	 * const db = client.getDatabase();
	 * ```
	 */
	constructor(db: string, grpcClient: TigrisClient, config: TigrisClientConfig) {
		this._name = db;
		this.grpcClient = grpcClient;
		this.config = config;
		this.schemaProcessor = DecoratedSchemaProcessor.Instance;
		this._metadataStorage = getDecoratorMetaStorage();
		this._branchVar = Utility.branchNameFromEnv(config.branch) ?? DefaultBranch;
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
			const generatedColl = this.schemaProcessor.process(
				nameOrClass as new () => TigrisCollectionType
			);
			collectionName = generatedColl.name;
			schema = generatedColl.schema as TigrisSchema<T>;
		}
		return this.createOrUpdate(
			collectionName,
			schema,
			() => new Collection(collectionName, this._name, this.branch, this.grpcClient, this.config)
		);
	}

	private createOrUpdate<T extends TigrisCollectionType, R>(
		name: string,
		schema: TigrisSchema<T>,
		resolver: () => R
	): Promise<R> {
		return new Promise<R>((resolve, reject) => {
			const rawJSONSchema: string = Utility._toJSONSchema(name, schema);
			const createOrUpdateCollectionRequest = new ProtoCreateOrUpdateCollectionRequest()
				.setProject(this._name)
				.setBranch(this.branch)
				.setCollection(name)
				.setOnlyCreate(false)
				.setSchema(Utility.stringToUint8Array(rawJSONSchema));

			Log.event(`Creating collection: '${name}' in project: '${this._name}'`);
			this.grpcClient.createOrUpdateCollection(
				createOrUpdateCollectionRequest,
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				(error, _response) => {
					if (error) {
						reject(error);
						return;
					}
					resolve(resolver());
				}
			);
		});
	}

	public listCollections(options?: CollectionOptions): Promise<Array<CollectionInfo>> {
		return new Promise<Array<CollectionInfo>>((resolve, reject) => {
			const request = new ProtoListCollectionsRequest()
				.setProject(this.name)
				.setBranch(this.branch);
			if (typeof options !== "undefined") {
				return request.setOptions(new ProtoCollectionOptions());
			}
			this.grpcClient.listCollections(request, (error, response) => {
				if (error) {
					reject(error);
				} else {
					const result = response
						.getCollectionsList()
						.map(
							(collectionInfo) =>
								new CollectionInfo(collectionInfo.getCollection(), new CollectionMetadata())
						);
					resolve(result);
				}
			});
		});
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
		return new Promise<DropCollectionResponse>((resolve, reject) => {
			this.grpcClient.dropCollection(
				new ProtoDropCollectionRequest()
					.setProject(this.name)
					.setBranch(this.branch)
					.setCollection(collectionName),
				(error, response) => {
					if (error) {
						reject(error);
					} else {
						resolve(new DropCollectionResponse(response.getMessage()));
					}
				}
			);
		});
	}

	public dropAllCollections(): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			this.listCollections()
				.then((value: Array<CollectionInfo>) => {
					for (const collectionInfo of value) {
						this.dropCollection(collectionInfo.name);
					}
					resolve();
				})
				.catch((error) => reject(error));
		});
	}

	public describe(): Promise<DatabaseDescription> {
		return new Promise<DatabaseDescription>((resolve, reject) => {
			this.grpcClient.describeDatabase(
				new ProtoDescribeDatabaseRequest().setProject(this.name).setBranch(this.branch),
				(error, response) => {
					if (error) {
						reject(error);
					} else {
						const collectionsDescription: CollectionDescription[] = [];
						for (let i = 0; i < response.getCollectionsList().length; i++) {
							collectionsDescription.push(
								new CollectionDescription(
									response.getCollectionsList()[i].getCollection(),
									new CollectionMetadata(),
									response.getCollectionsList()[i].getSchema_asB64()
								)
							);
						}
						resolve(
							new DatabaseDescription(
								new DatabaseMetadata(),
								collectionsDescription,
								response.getBranchesList()
							)
						);
					}
				}
			);
		});
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
		return new Collection<T>(collectionName, this.name, this.branch, this.grpcClient, this.config);
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
		return new Promise<Session>((resolve, reject) => {
			const beginTxRequest = new ProtoBeginTransactionRequest()
				.setProject(this._name)
				.setBranch(this.branch);
			const cookie: Metadata = new Metadata();
			const call = this.grpcClient.makeUnaryRequest(
				BeginTransactionMethodName,
				(value) => Buffer.from(value.serializeBinary()),
				(value) => BeginTransactionResponse.deserializeBinary(value),
				beginTxRequest,
				(error: ServiceError, response: BeginTransactionResponse) => {
					if (error) {
						reject(error);
					} else {
						// on metadata is expected to have invoked at this point since response
						// is served
						resolve(
							new Session(
								response.getTxCtx().getId(),
								response.getTxCtx().getOrigin(),
								this.grpcClient,
								this.name,
								this.branch,
								cookie
							)
						);
					}
				}
			);
			call.on("metadata", (metadata) => {
				if (metadata.get(SetCookie)) {
					for (const inboundCookie of metadata.get(SetCookie)) cookie.add(Cookie, inboundCookie);
				}
			});
		});
	}

	public createBranch(name: string): Promise<CreateBranchResponse> {
		return new Promise((resolve, reject) => {
			const req = new ProtoCreateBranchRequest().setProject(this.name).setBranch(name);
			this.grpcClient.createBranch(req, (error, response) => {
				if (error) {
					reject(error);
					return;
				}
				resolve(CreateBranchResponse.from(response));
			});
		});
	}

	public deleteBranch(name: string): Promise<DeleteBranchResponse> {
		return new Promise((resolve, reject) => {
			const req = new ProtoDeleteBranchRequest().setProject(this.name).setBranch(name);
			this.grpcClient.deleteBranch(req, (error, response) => {
				if (error) {
					reject(error);
					return;
				}
				resolve(DeleteBranchResponse.from(response));
			});
		});
	}

	/**
	 * Initializes a database branch if it needs to be dynamically created.
	 *
	 * Calls {@link describe|describe()} to assert that the branch in use already exists. If not, and the
	 * branch name needs to be generated dynamically (ex - `preview_${GIT_BRANCH}`) then try to
	 * create that branch.
	 *
	 * @example
	 * ```
	 * const client = new TigrisClient();
	 * const db = client.getDatabase();
	 * await db.initializeBranch();
	 * ```
	 *
	 * @throws {@link Promise.reject} - Error if branch doesn't exist and/or cannot be created
	 */
	public async initializeBranch(): Promise<void> {
		if (!this.usingDefaultBranch) {
			try {
				if (this._branchVar.dynamicCreation) {
					await this.createBranch(this.branch);
					Log.event(`Created database branch: ${this.branch}`);
				} else {
					const description: DatabaseDescription = await this.describe();
					if (!description.branches.includes(this.branch)) {
						throw new BranchNotFoundError(this.branch);
					}
				}
			} catch (error) {
				if ((error as ServiceError).code !== Status.ALREADY_EXISTS) {
					throw new BranchNotFoundError(this.branch);
				}
			}
			Log.info(`Using database branch: '${this.branch}'`);
		}
	}

	get name(): string {
		return this._name;
	}

	get branch(): string {
		return this._branchVar.name;
	}

	get usingDefaultBranch(): boolean {
		return this.branch === DefaultBranch.name;
	}
}
