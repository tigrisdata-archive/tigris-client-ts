import {TigrisClient} from "./proto/server/v1/api_grpc_pb";
import * as grpc from "@grpc/grpc-js";
import {status} from "@grpc/grpc-js";
import {
	CreateDatabaseRequest as ProtoCreateDatabaseRequest,
	DatabaseOptions as ProtoDatabaseOptions,
	DropDatabaseRequest as ProtoDropDatabaseRequest,
	GetInfoRequest as ProtoGetInfoRequest,
	ListDatabasesRequest as ProtoListDatabasesRequest
} from "./proto/server/v1/api_pb";
import {
	DatabaseInfo,
	DatabaseMetadata,
	DatabaseOptions,
	DropDatabaseResponse,
	ServerMetadata
} from "./types";

import {GetAccessTokenRequest as ProtoGetAccessTokenRequest} from "./proto/server/v1/auth_pb";

import {DB} from "./db";
import {AuthClient} from "./proto/server/v1/auth_grpc_pb";
import {Utility} from "./utility";

const AuthorizationHeaderName = "authorization";
const AuthorizationBearer = "Bearer ";

export interface TigrisClientConfig {
	serverUrl: string;
	insecureChannel?: boolean
	refreshToken?: string
}

class TokenSupplier {
	private refreshToken: string;
	private accessToken: string;
	private nextRefreshTime: number;
	private authClient: AuthClient;

	constructor(config: TigrisClientConfig) {
		this.authClient = new AuthClient(config.serverUrl, grpc.credentials.createSsl());
	}

	getAccessToken(): string {
		if (this.shouldRefresh()) {
			// refresh
			this.authClient.getAccessToken(
				new ProtoGetAccessTokenRequest().setRefreshToken(this.refreshToken),
				(error, response) => {
					if (error) {
						// log failure
						console.error(error);
					} else {
						this.accessToken = response.getAccessToken();
						this.refreshToken = response.getAccessToken();
						// retrieve exp
						const parts: string[] = this.accessToken.split("\\.");
						const exp = Number(Utility.jsonStringToObj(Utility._base64Decode(parts[1]))["exp"]);
						// 5 min before expiry (note: exp is in seconds)
						// add random jitter of 1-5 min (i.e. 60000 - 300000 ms)
						this.nextRefreshTime = (exp * 1000) - 300_000 - (Utility._getRandomInt(300_000) + 60_000);
					}
				});
		}
		return this.accessToken;
	}

	shouldRefresh(): boolean {
		if (typeof this.accessToken === "undefined") {
			return true;
		}
		return Date.now() >= this.nextRefreshTime;
	}
}

/**
 * Tigris client
 */
export class Tigris {
	grpcClient: TigrisClient;

	/**
	 *
	 * @param  {TigrisClientConfig} config configuration
	 */
	constructor(config: TigrisClientConfig) {
		if ((config.insecureChannel === undefined || config.insecureChannel === false) && config.refreshToken === undefined) {
			this.grpcClient = new TigrisClient(config.serverUrl, grpc.credentials.createInsecure());
		} else if ((config.insecureChannel === undefined || config.insecureChannel) && config.refreshToken !== undefined) {
			console.log("Passing token on insecure channel is not allowed");
			process.exitCode = 1;
		} else {
			const tokenSupplier = new TokenSupplier(config);
			this.grpcClient = new TigrisClient(config.serverUrl, grpc.credentials.combineChannelCredentials(
				grpc.credentials.createSsl(),
				grpc.credentials.createFromMetadataGenerator((params, callback) => {
					const accessToken = tokenSupplier.getAccessToken();
					const md = new grpc.Metadata();
					md.set(AuthorizationHeaderName, AuthorizationBearer + accessToken);
					return callback(undefined, md);
				})));
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
						resolve(new DB(db, this.grpcClient));
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
		return new DB(db, this.grpcClient);
	}

	public getServerMetadata(): Promise<ServerMetadata> {
		return new Promise<ServerMetadata>((resolve, reject) => {
			this.grpcClient.getInfo(new ProtoGetInfoRequest(), (error, response) => {
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
export default new Tigris({serverUrl: `${process.env.TIGRIS_SERVER_URL}`});
