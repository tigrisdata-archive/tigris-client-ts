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
import { CollectionNotFoundError, BranchNameRequiredError } from "./error";
import { Status } from "@grpc/grpc-js/build/src/constants";

const SetCookie = "Set-Cookie";
const Cookie = "Cookie";
const BeginTransactionMethodName = "/tigrisdata.v1.Tigris/BeginTransaction";
const DefaultBranch = "main";

/**
 * Tigris Database class to manage database branches, collections and execute
 * transactions.
 */
export class DB {
	private readonly _name: string;
	private readonly _branch: string;
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
			() => new Collection(collectionName, this._name, this.branch, this.grpcClient, this.config)
		);
	}

	private createOrUpdate<T extends TigrisCollectionType, R>(
		name: string,
		schema: TigrisSchema<T>,
		resolver: () => R
	): Promise<R> {
		return new Promise<R>((resolve, reject) => {
			const rawJSONSchema: string = Utility._collectionSchematoJSON(name, schema);
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

	public async dropAllCollections(): Promise<PromiseSettledResult<DropCollectionResponse>[]> {
		const collections = await this.listCollections();
		const dropPromises = collections.map((coll) => {
			return this.dropCollection(coll.name);
		});
		return Promise.allSettled(dropPromises);
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
				if ((error as ServiceError).code === Status.ALREADY_EXISTS) {
					Log.event(`'${this.branch}' branch already exists`);
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
