import { TigrisClient } from "./proto/server/v1/api_grpc_pb";
import { ObservabilityClient } from "./proto/server/v1/observability_grpc_pb";
import { HealthAPIClient } from "./proto/server/v1/health_grpc_pb";
import * as grpc from "@grpc/grpc-js";
import { ChannelCredentials, Metadata } from "@grpc/grpc-js";
import { GetInfoRequest as ProtoGetInfoRequest } from "./proto/server/v1/observability_pb";
import { HealthCheckInput as ProtoHealthCheckInput } from "./proto/server/v1/health_pb";

import * as dotenv from "dotenv";
import {
	DeleteCacheResponse,
	ListCachesResponse,
	ServerMetadata,
	TigrisCollectionType,
	CacheMetadata,
} from "./types";

import {
	GetAccessTokenRequest as ProtoGetAccessTokenRequest,
	GrantType,
} from "./proto/server/v1/auth_pb";

import { DB } from "./db";
import { AuthClient } from "./proto/server/v1/auth_grpc_pb";
import { Utility } from "./utility";
import { Log } from "./utils/logger";
import { DecoratorMetaStorage } from "./decorators/metadata/decorator-meta-storage";
import { getDecoratorMetaStorage } from "./globals";
import { Cache } from "./cache";
import { CacheClient } from "./proto/server/v1/cache_grpc_pb";
import { CreateCacheRequest as ProtoCreateCacheRequest } from "./proto/server/v1/cache_pb";
import { DeleteCacheRequest as ProtoDeleteCacheRequest } from "./proto/server/v1/cache_pb";
import { ListCachesRequest as ProtoListCachesRequest } from "./proto/server/v1/cache_pb";

import { Status } from "@grpc/grpc-js/build/src/constants";

const AuthorizationHeaderName = "authorization";
const AuthorizationBearer = "Bearer ";

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
}

class TokenSupplier {
	private readonly clientId: string;
	private readonly clientSecret: string;
	private readonly authClient: AuthClient;
	private readonly config: TigrisClientConfig;

	private accessToken: string;
	private nextRefreshTime: number;

	constructor(config: TigrisClientConfig) {
		this.authClient = new AuthClient(config.serverUrl, grpc.credentials.createSsl());
		this.clientId = config.clientId;
		this.clientSecret = config.clientSecret;
		this.config = config;
	}

	getAccessToken(): Promise<string> {
		return new Promise<string>((resolve, reject) => {
			if (this.shouldRefresh()) {
				// refresh
				this.authClient.getAccessToken(
					new ProtoGetAccessTokenRequest()
						.setGrantType(GrantType.CLIENT_CREDENTIALS)
						.setClientId(this.clientId)
						.setClientSecret(this.clientSecret),
					(error, response) => {
						if (error) {
							reject(error);
						} else {
							this.accessToken = response.getAccessToken();

							// retrieve exp
							const parts: string[] = this.accessToken.split(".");
							const exp = Number(
								Utility.jsonStringToObj(Utility._base64Decode(parts[1]), this.config)["exp"]
							);
							// 5 min before expiry (note: exp is in seconds)
							// add random jitter of 1-5 min (i.e. 60000 - 300000 ms)
							this.nextRefreshTime =
								exp * 1000 - 300_000 - (Utility._getRandomInt(300_000) + 60_000);
							resolve(this.accessToken);
						}
					}
				);
			} else {
				resolve(this.accessToken);
			}
		});
	}

	shouldRefresh(): boolean {
		if (typeof this.accessToken === "undefined") {
			return true;
		}
		return Date.now() >= this.nextRefreshTime;
	}
}

const DEFAULT_GRPC_PORT = 443;
const DEFAULT_URL = "api.preview.tigrisdata.cloud";

const USER_AGENT_KEY = "user-agent";
const USER_AGENT_VAL = "tigris-client-ts.grpc";
const DEST_NAME_KEY = "destination-name";

/**
 * Tigris client
 */
export class Tigris {
	private readonly grpcClient: TigrisClient;
	private readonly observabilityClient: ObservabilityClient;
	private readonly cacheClient: CacheClient;
	private readonly healthAPIClient: HealthAPIClient;
	private readonly _config: TigrisClientConfig;
	private readonly _metadataStorage: DecoratorMetaStorage;
	private readonly _ping: () => void;
	private readonly pingId: NodeJS.Timeout | number | string | undefined;

	/**
	 *
	 * @param  {TigrisClientConfig} config configuration
	 */
	constructor(config?: TigrisClientConfig) {
		dotenv.config();
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
		const defaultMetadata: Metadata = new Metadata();
		defaultMetadata.set(USER_AGENT_KEY, USER_AGENT_VAL);
		defaultMetadata.set(DEST_NAME_KEY, config.serverUrl);

		if (
			(config.serverUrl.includes("localhost") ||
				config.serverUrl.startsWith("tigris-local-server:") ||
				config.serverUrl.includes("127.0.0.1") ||
				config.serverUrl.includes("[::1]")) &&
			config.clientId === undefined &&
			config.clientSecret === undefined
		) {
			// no auth - generate insecure channel
			const insecureCreds: ChannelCredentials = grpc.credentials.createInsecure();
			this.grpcClient = new TigrisClient(config.serverUrl, insecureCreds);
			this.observabilityClient = new ObservabilityClient(config.serverUrl, insecureCreds);
			this.cacheClient = new CacheClient(config.serverUrl, insecureCreds);
			this.healthAPIClient = new HealthAPIClient(config.serverUrl, insecureCreds);
		} else if (config.clientId === undefined || config.clientSecret === undefined) {
			throw new Error("Both `clientId` and `clientSecret` are required");
		} else {
			// auth & secure channel
			const tokenSupplier = new TokenSupplier(config);
			const channelCreds: ChannelCredentials = grpc.credentials.combineChannelCredentials(
				grpc.credentials.createSsl(),
				grpc.credentials.createFromMetadataGenerator((params, callback) => {
					tokenSupplier
						.getAccessToken()
						.then((accessToken) => {
							const md = new grpc.Metadata();
							md.set(AuthorizationHeaderName, AuthorizationBearer + accessToken);
							md.merge(defaultMetadata);
							return callback(undefined, md);
						})
						.catch((error) => {
							return callback(error);
						});
				})
			);
			this.grpcClient = new TigrisClient(config.serverUrl, channelCreds);
			this.observabilityClient = new ObservabilityClient(config.serverUrl, channelCreds);
			this.cacheClient = new CacheClient(config.serverUrl, channelCreds);
			this.healthAPIClient = new HealthAPIClient(config.serverUrl, channelCreds);
			this._ping = () => {
				this.healthAPIClient.health(new ProtoHealthCheckInput(), (error, response) => {
					if (response !== undefined) {
						Log.debug("health: " + response.getResponse());
					}
				});
			};
			if (config.enablePing) {
				// make a ping to server at configured interval
				let pingIntervalMs = config.pingIntervalMs;
				if (pingIntervalMs === undefined) {
					// 5min
					pingIntervalMs = 300_000;
				}
				this.pingId = setInterval(this._ping, pingIntervalMs);
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
		return new DB(this._config.projectName, this.grpcClient, this._config);
	}

	/**
	 * Creates the cache for this project, if the cache doesn't already exist
	 * @param cacheName
	 */
	public createCacheIfNotExists(cacheName: string): Promise<Cache> {
		return new Promise<Cache>((resolve, reject) => {
			this.cacheClient.createCache(
				new ProtoCreateCacheRequest().setProject(this._config.projectName).setName(cacheName),
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				(error, response) => {
					if (error && error.code != Status.ALREADY_EXISTS) {
						reject(error);
					} else {
						resolve(new Cache(this._config.projectName, cacheName, this.cacheClient, this._config));
					}
				}
			);
		});
	}

	/**
	 * Deletes the entire cache from this project.
	 * @param cacheName
	 */
	public deleteCache(cacheName: string): Promise<DeleteCacheResponse> {
		return new Promise<DeleteCacheResponse>((resolve, reject) => {
			this.cacheClient.deleteCache(
				new ProtoDeleteCacheRequest().setProject(this._config.projectName).setName(cacheName),
				(error, response) => {
					if (error) {
						reject(error);
					} else {
						resolve(new DeleteCacheResponse(response.getStatus(), response.getMessage()));
					}
				}
			);
		});
	}

	/**
	 * Lists all the caches for this project
	 */
	public listCaches(): Promise<ListCachesResponse> {
		return new Promise<ListCachesResponse>((resolve, reject) => {
			this.cacheClient.listCaches(
				new ProtoListCachesRequest().setProject(this._config.projectName),
				(error, response) => {
					if (error) {
						reject(error);
					} else {
						const cachesMetadata: CacheMetadata[] = new Array<CacheMetadata>();
						for (const value of response.getCachesList())
							cachesMetadata.push(new CacheMetadata(value.getName()));
						resolve(new ListCachesResponse(cachesMetadata));
					}
				}
			);
		});
	}

	public getCache(cacheName: string): Cache {
		return new Cache(this._config.projectName, cacheName, this.cacheClient, this._config);
	}

	public getServerMetadata(): Promise<ServerMetadata> {
		return new Promise<ServerMetadata>((resolve, reject) => {
			this.observabilityClient.getInfo(new ProtoGetInfoRequest(), (error, response) => {
				if (error) {
					reject(error);
				} else {
					resolve(new ServerMetadata(response.getServerVersion()));
				}
			});
		});
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
		const tigrisDb = await this.getDatabase();

		for (const coll of collections) {
			const found = this._metadataStorage.getCollectionByTarget(coll as Function);
			if (!found) {
				Log.error(`No such collection defined: '${coll.toString()}'`);
			} else {
				await tigrisDb.createOrUpdateCollection(found.target.prototype.constructor);
			}
		}
	}

	private close(): void {
		if (this.pingId !== undefined) {
			clearInterval(this.pingId);
		}
	}
}
