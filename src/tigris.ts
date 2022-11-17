import { TigrisClient } from "./proto/server/v1/api_grpc_pb";
import { ObservabilityClient } from "./proto/server/v1/observability_grpc_pb";
import { HealthAPIClient } from "./proto/server/v1/health_grpc_pb";
import * as grpc from "@grpc/grpc-js";
import { ChannelCredentials, Metadata, status } from "@grpc/grpc-js";
import {
	CreateDatabaseRequest as ProtoCreateDatabaseRequest,
	DatabaseOptions as ProtoDatabaseOptions,
	DropDatabaseRequest as ProtoDropDatabaseRequest,
	ListDatabasesRequest as ProtoListDatabasesRequest,
} from "./proto/server/v1/api_pb";
import { GetInfoRequest as ProtoGetInfoRequest } from "./proto/server/v1/observability_pb";
import { HealthCheckInput as ProtoHealthCheckInput } from "./proto/server/v1/health_pb";

import path from "node:path";
import appRootPath from "app-root-path";
import * as dotenv from "dotenv";
import {
	DatabaseInfo,
	DatabaseMetadata,
	DatabaseOptions,
	DropDatabaseResponse,
	ServerMetadata,
} from "./types";

import {
	GetAccessTokenRequest as ProtoGetAccessTokenRequest,
	GrantType,
} from "./proto/server/v1/auth_pb";

import { DB } from "./db";
import { AuthClient } from "./proto/server/v1/auth_grpc_pb";
import { Utility } from "./utility";
import { loadTigrisManifest, TigrisManifest } from "./utils/manifest-loader";
import { Log } from "./utils/logger";

const AuthorizationHeaderName = "authorization";
const AuthorizationBearer = "Bearer ";

export interface TigrisClientConfig {
	serverUrl?: string;
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
	 * Tigris makes periodic ping to server in order to keep connection alive in case if user's
	 * workload is pub/sub with no messages for long period.
	 */
	disablePing?: boolean;

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
	private readonly healthAPIClient: HealthAPIClient;
	private readonly _config: TigrisClientConfig;
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

			if ("TIGRIS_URI" in process.env) {
				config.serverUrl = process.env.TIGRIS_URI;
			}
			if ("TIGRIS_URL" in process.env) {
				config.serverUrl = process.env.TIGRIS_URL;
			}
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
				config.serverUrl.includes("127.0.0.1") ||
				config.serverUrl.includes("[::1]")) &&
			config.clientId === undefined &&
			config.clientSecret === undefined
		) {
			// no auth - generate insecure channel
			const insecureCreds: ChannelCredentials = grpc.credentials.createInsecure();
			this.grpcClient = new TigrisClient(config.serverUrl, insecureCreds);
			this.observabilityClient = new ObservabilityClient(config.serverUrl, insecureCreds);
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
			this.healthAPIClient = new HealthAPIClient(config.serverUrl, channelCreds);
			this._ping = () => {
				this.healthAPIClient.health(new ProtoHealthCheckInput(), (error, response) => {
					if (response !== undefined) {
						Log.debug("health: " + response.getResponse());
					}
				});
			};
			if (config.disablePing === undefined || !config.disablePing) {
				// make a ping to server every 5 minute
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
		Log.info(`Using Tigris at: ${config.serverUrl}`);
	}

	/**
	 * Lists the databases
	 * @return {Promise<Array<DatabaseInfo>>} a promise of an array of
	 * DatabaseInfo
	 */
	public listDatabases(): Promise<Array<DatabaseInfo>> {
		return new Promise<Array<DatabaseInfo>>((resolve, reject) => {
			this.grpcClient.listDatabases(new ProtoListDatabasesRequest(), (error, response) => {
				if (error) {
					reject(error);
				} else {
					const result = response
						.getDatabasesList()
						.map(
							(protoDatabaseInfo) =>
								new DatabaseInfo(protoDatabaseInfo.getDb(), new DatabaseMetadata())
						);
					resolve(result);
				}
			});
		});
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	public createDatabaseIfNotExists(db: string, _options?: DatabaseOptions): Promise<DB> {
		return new Promise<DB>((resolve, reject) => {
			this.grpcClient.createDatabase(
				new ProtoCreateDatabaseRequest().setDb(db).setOptions(new ProtoDatabaseOptions()),
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				(error, _response) => {
					if (error && error.code != status.ALREADY_EXISTS) {
						reject(error);
					} else {
						resolve(new DB(db, this.grpcClient, this._config));
					}
				}
			);
		});
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	public dropDatabase(db: string, _options?: DatabaseOptions): Promise<DropDatabaseResponse> {
		return new Promise<DropDatabaseResponse>((resolve, reject) => {
			this.grpcClient.dropDatabase(
				new ProtoDropDatabaseRequest().setDb(db).setOptions(new ProtoDatabaseOptions()),
				(error, response) => {
					if (error) {
						reject(error);
					} else {
						resolve(new DropDatabaseResponse(response.getStatus(), response.getMessage()));
					}
				}
			);
		});
	}

	public getDatabase(db: string): DB {
		return new DB(db, this.grpcClient, this._config);
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
	 * Automatically provision Databases and Collections based on the directories
	 * and {@link TigrisSchema} definitions in file system
	 *
	 * @param schemaPath - Directory location in file system. Recommended to
	 * provide an absolute path, else loader will try to access application's root
	 * path which may not be accurate.
	 */
	public async registerSchemas(schemaPath: string) {
		if (!path.isAbsolute(schemaPath)) {
			schemaPath = path.join(appRootPath.toString(), schemaPath);
		}
		const manifest: TigrisManifest = loadTigrisManifest(schemaPath);

		for (const dbManifest of manifest) {
			// create DB
			const tigrisDb = await this.createDatabaseIfNotExists(dbManifest.dbName);
			Log.event(`Created database: ${dbManifest.dbName}`);

			for (const coll of dbManifest.collections) {
				// Create a collection
				const collection = await tigrisDb.createOrUpdateCollection(
					coll.collectionName,
					coll.schema
				);
				Log.event(
					`Created collection: ${collection.collectionName} from schema: ${coll.schemaName} in db: ${dbManifest.dbName}`
				);
			}
		}
	}

	private close(): void {
		if (this.pingId !== undefined) {
			clearInterval(this.pingId);
		}
	}
}
