import { TigrisClient } from "./proto/server/v1/api_grpc_pb";
import { ObservabilityClient } from "./proto/server/v1/observability_grpc_pb";

import * as grpc from "@grpc/grpc-js";
import { ChannelCredentials, Metadata, status } from "@grpc/grpc-js";
import {
	CreateDatabaseRequest as ProtoCreateDatabaseRequest,
	DatabaseOptions as ProtoDatabaseOptions,
	DropDatabaseRequest as ProtoDropDatabaseRequest,
	ListDatabasesRequest as ProtoListDatabasesRequest,
} from "./proto/server/v1/api_pb";
import { GetInfoRequest as ProtoGetInfoRequest } from "./proto/server/v1/observability_pb";

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
	private readonly config: TigrisClientConfig;

	/**
	 *
	 * @param  {TigrisClientConfig} config configuration
	 */
	constructor(config?: TigrisClientConfig) {
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

		this.config = config;
		const defaultMetadata: Metadata = new Metadata();
		defaultMetadata.set(USER_AGENT_KEY, USER_AGENT_VAL);
		defaultMetadata.set(DEST_NAME_KEY, config.serverUrl);

		if (
			(config.serverUrl.includes("localhost") ||
				config.serverUrl.includes("127.0.0.1") ||
				config.serverUrl.includes("0.0.0.0:") ||
				config.serverUrl.includes("[::1]")) &&
			config.clientId === undefined &&
			config.clientSecret === undefined
		) {
			// no auth - generate insecure channel
			this.grpcClient = new TigrisClient(config.serverUrl, grpc.credentials.createInsecure());
			this.observabilityClient = new ObservabilityClient(
				config.serverUrl,
				grpc.credentials.createInsecure()
			);
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
		}
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
						resolve(new DB(db, this.grpcClient, this.config));
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
		return new DB(db, this.grpcClient, this.config);
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
}

/**
 * Default instance of the Tigris client
 */
export default new Tigris({
	serverUrl: `${process.env.TIGRIS_URI}`,
	clientId: `${process.env.TIGRIS_CLIENT_ID}`,
	clientSecret: `${process.env.TIGRIS_CLIENT_SECRET}`,
});
