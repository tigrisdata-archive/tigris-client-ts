import {
	DeleteCacheResponse,
	ListCachesResponse,
	ServerMetadata,
	TigrisCollectionType,
} from "./types";

import { DB } from "./db";
import { Log } from "./utils/logger";
import { DecoratorMetaStorage } from "./decorators/metadata/decorator-meta-storage";
import { getDecoratorMetaStorage } from "./globals";
import { Cache } from "./cache";

import { initializeEnvironment } from "./utils/env-loader";
import { Search } from "./search/search";
import Driver from "./driver/driver";
import GrpcDriver from "./driver/grpc/grpc";

export interface TigrisClientConfig {
	serverUrl?: string;
	projectName?: string;
	/**
	 * Use clientId/clientSecret to authenticate production services.
	 * Obtains at console.preview.tigrisdata.cloud in `Applications Keys` section
	 * or by running `tigris create application {app_name} {app_description}` CLI command
	 */
	clientId?: string;
	clientSecret?: string;
	/**
	 * Tigris uses custom deserialization to support `bigint`. By default, the `bigint` from JSON
	 * string will be converted back to model object as a `string` field. If user wants to
	 * convert it back to `bigint`, set this property to `true`.
	 */
	supportBigInt?: boolean;

	/**
	 * Tigris can make periodic ping to server in order to keep connection alive in case if user's
	 * workload is pub/sub with no messages for long period.
	 */
	enablePing?: boolean;

	/**
	 * Controls the ping interval, if not specified defaults to 300_000ms (i.e. 5 min)
	 */
	pingIntervalMs?: number;

	/**
	 * Database branch name
	 */
	branch?: string;
}

const DEFAULT_GRPC_PORT = 443;
const DEFAULT_URL = "api.preview.tigrisdata.cloud";

/**
 * Tigris client
 */
export class Tigris {
	private readonly _config: TigrisClientConfig;
	private readonly _metadataStorage: DecoratorMetaStorage;
	private readonly _ping: () => void;
	private readonly pingId: NodeJS.Timeout | number | string | undefined;
	private readonly driver: Driver;

	/**
	 * Create Tigris client
	 *
	 * @param  config - {@link TigrisClientConfig} configuration
	 */
	constructor(config?: TigrisClientConfig) {
		initializeEnvironment();
		if (typeof config === "undefined") {
			config = {};
		}
		if (config.serverUrl === undefined) {
			config.serverUrl = DEFAULT_URL;
			if (process.env.TIGRIS_URI?.trim().length > 0) {
				config.serverUrl = process.env.TIGRIS_URI;
			}
			if (process.env.TIGRIS_URL?.trim().length > 0) {
				config.serverUrl = process.env.TIGRIS_URL;
			}
		}

		if (config.projectName === undefined) {
			if (!("TIGRIS_PROJECT" in process.env)) {
				throw new Error("Unable to resolve TIGRIS_PROJECT environment variable");
			}

			config.projectName = process.env.TIGRIS_PROJECT;
		}

		if (config.serverUrl.startsWith("https://")) {
			config.serverUrl = config.serverUrl.replace("https://", "");
		}
		if (config.serverUrl.startsWith("http://")) {
			config.serverUrl = config.serverUrl.replace("http://", "");
		}

		if (config.clientId === undefined && "TIGRIS_CLIENT_ID" in process.env) {
			config.clientId = process.env.TIGRIS_CLIENT_ID;
		}
		if (config.clientSecret === undefined && "TIGRIS_CLIENT_SECRET" in process.env) {
			config.clientSecret = process.env.TIGRIS_CLIENT_SECRET;
		}

		if (!config.serverUrl.includes(":")) {
			config.serverUrl = config.serverUrl + ":" + DEFAULT_GRPC_PORT;
		}

		this._config = config;
		this.driver = new GrpcDriver(config);
		if (config.enablePing) {
			this._ping = async () => {
				try {
					const resp = await this.driver.health();
					Log.debug(`health: ${resp}`);
				} catch (error) {
					Log.error(`health: ${error}`);
				}
			};
			// make a ping to server at configured interval
			let pingIntervalMs = config.pingIntervalMs;
			if (pingIntervalMs === undefined) {
				// 5min
				pingIntervalMs = 300_000;
			}
			this.pingId = setInterval(this._ping, pingIntervalMs);
			if (typeof process !== "undefined") {
				// stop ping on shutdown
				process.on("exit", () => {
					this.close();
				});
			}
		}
		this._metadataStorage = getDecoratorMetaStorage();
		Log.info(`Using Tigris at: ${config.serverUrl}`);
	}

	public getDatabase(): DB {
		return new DB(this._config.projectName, this.driver, this._config);
	}

	/**
	 * Creates the cache for this project, if the cache doesn't already exist
	 * @param name - cache identifier
	 */
	public async createCacheIfNotExists(name: string): Promise<Cache> {
		await this.driver.cache().createCache(name);
		return new Cache(this._config.projectName, name, this.driver.cache());
	}

	/**
	 * Deletes the entire cache from this project.
	 * @param name - cache identifier
	 */
	public deleteCache(name: string): Promise<DeleteCacheResponse> {
		return this.driver.cache().deleteCache(name);
	}

	/**
	 * Lists all the caches for this project
	 */
	public listCaches(): Promise<ListCachesResponse> {
		return this.driver.cache().listCaches();
	}

	public getCache(cacheName: string): Cache {
		return new Cache(this._config.projectName, cacheName, this.driver.cache());
	}

	public getSearch(): Search {
		return new Search(this.driver.search(), this._config);
	}

	public getServerMetadata(): Promise<ServerMetadata> {
		return this.driver.observability().getInfo();
	}

	/**
	 * Automatically create Project and create or update Collections.
	 * Collection classes decorated with {@link TigrisCollection} decorator will be
	 * created if not already existing. If Collection already exists, schema changes
	 * will be applied, if any.
	 *
	 * @param collections - Array of Collection classes
	 *
	 * @example
	 * ```
	 * @TigrisCollection("todoItems")
	 * class TodoItem {
	 *   @PrimaryKey(TigrisDataTypes.INT32, { order: 1 })
	 *   id: number;
	 *
	 *   @Field()
	 *   text: string;
	 * }
	 *
	 * await db.registerSchemas([TodoItem]);
	 * ```
	 */
	public async registerSchemas(collections: Array<TigrisCollectionType>) {
		const tigrisDb = this.getDatabase();

		for (const coll of collections) {
			const found = this._metadataStorage.getCollectionByTarget(coll as Function);
			if (!found) {
				Log.error(`No such collection defined: '${coll.toString()}'`);
			} else {
				await tigrisDb.createOrUpdateCollection(found.target.prototype.constructor);
			}
		}
	}

	/**
	 * Shutdown, if ping is being used in order to keep connection alive.
	 */
	public close(): void {
		if (this.pingId !== undefined) {
			clearInterval(this.pingId);
		}
	}
}
