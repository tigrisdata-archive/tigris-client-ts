import { TigrisClient } from "./proto/server/v1/api_grpc_pb";
import {
	CollectionDescription,
	CollectionInfo,
	CollectionMetadata,
	CollectionOptions,
	CommitTransactionResponse,
	DatabaseDescription,
	DatabaseMetadata,
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
	CreateOrUpdateCollectionRequest as ProtoCreateOrUpdateCollectionRequest,
	DescribeDatabaseRequest as ProtoDescribeDatabaseRequest,
	DropCollectionRequest as ProtoDropCollectionRequest,
	ListCollectionsRequest as ProtoListCollectionsRequest,
} from "./proto/server/v1/api_pb";
import { Collection } from "./collection";
import { Session } from "./session";
import { Utility } from "./utility";
import { Metadata, ServiceError } from "@grpc/grpc-js";
import { TigrisClientConfig } from "./tigris";
import { Log } from "./utils/logger";
import { DecoratedSchemaProcessor } from "./schema/decorated-schema-processor";

/**
 * Tigris Database
 */
const SetCookie = "Set-Cookie";
const Cookie = "Cookie";
const BeginTransactionMethodName = "/tigrisdata.v1.Tigris/BeginTransaction";

export class DB {
	private readonly _db: string;
	private readonly grpcClient: TigrisClient;
	private readonly config: TigrisClientConfig;
	private readonly schemaProcessor: DecoratedSchemaProcessor;

	constructor(db: string, grpcClient: TigrisClient, config: TigrisClientConfig) {
		this._db = db;
		this.grpcClient = grpcClient;
		this.config = config;
		this.schemaProcessor = DecoratedSchemaProcessor.Instance;
	}

	/**
	 * Create a new collection if not exists. Else, apply schema changes, if any.
	 *
	 * @param cls - A Class representing schema fields using decorators
	 *
	 * @example
	 *
	 * ```
	 * @TigrisCollection("todoItems")
	 * class TodoItem implements TigrisCollectionType {
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
			() => new Collection(collectionName, this._db, this.grpcClient, this.config)
		);
	}

	private createOrUpdate<T extends TigrisCollectionType, R>(
		name: string,
		schema: TigrisSchema<T>,
		resolver: () => R
	): Promise<R> {
		return new Promise<R>((resolve, reject) => {
			const rawJSONSchema: string = Utility._toJSONSchema(name, schema);
			Log.debug(rawJSONSchema);
			const createOrUpdateCollectionRequest = new ProtoCreateOrUpdateCollectionRequest()
				.setProject(this._db)
				.setCollection(name)
				.setOnlyCreate(false)
				.setSchema(Utility.stringToUint8Array(rawJSONSchema));

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
			const request = new ProtoListCollectionsRequest().setProject(this.db);
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

	public dropCollection(collectionName: string): Promise<DropCollectionResponse> {
		return new Promise<DropCollectionResponse>((resolve, reject) => {
			this.grpcClient.dropCollection(
				new ProtoDropCollectionRequest().setProject(this.db).setCollection(collectionName),
				(error, response) => {
					if (error) {
						reject(error);
					} else {
						resolve(new DropCollectionResponse(response.getStatus(), response.getMessage()));
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
				new ProtoDescribeDatabaseRequest().setProject(this.db),
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
						resolve(new DatabaseDescription(new DatabaseMetadata(), collectionsDescription));
					}
				}
			);
		});
	}

	public getCollection<T>(collectionName: string): Collection<T> {
		return new Collection<T>(collectionName, this.db, this.grpcClient, this.config);
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
							resolve(new TransactionResponse("transaction successful"));
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
			const beginTxRequest = new ProtoBeginTransactionRequest().setProject(this._db);
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
								this.db,
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

	get db(): string {
		return this._db;
	}
}
