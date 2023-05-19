import Driver, {
	CacheDriver,
	CollectionDriver,
	DatabaseDriver,
	ObservabilityDriver,
	SearchDriver,
} from "../driver";
import { TigrisClient } from "../../proto/server/v1/api_grpc_pb";
import * as grpc from "@grpc/grpc-js";
import { Metadata, ChannelCredentials, ClientOptions } from "@grpc/grpc-js";
import { HealthCheckInput as ProtoHealthCheckInput } from "../../proto/server/v1/health_pb";
import {
	GetAccessTokenRequest as ProtoGetAccessTokenRequest,
	GrantType,
} from "../../proto/server/v1/auth_pb";
import { AuthClient } from "../../proto/server/v1/auth_grpc_pb";
import { HealthAPIClient } from "../../proto/server/v1/health_grpc_pb";
import { TigrisClientConfig } from "../../tigris";
import { TokenSupplier } from "../../tokensupplier";
import { Database } from "./database";
import { GrpcCollectionDriver } from "./collection";
import { Cache } from "./cache";
import { Observability } from "./observability";
import { Search } from "./search";
import { ServiceConfig } from "@grpc/grpc-js/build/src/service-config";

const AuthorizationHeaderName = "authorization";
const AuthorizationBearer = "Bearer ";
const USER_AGENT_KEY = "user-agent";
const USER_AGENT_VAL = "tigris-client-ts.grpc";
const DEST_NAME_KEY = "destination-name";

export default class GrpcDriver implements Driver {
	grpcClient: TigrisClient;
	authClient: AuthClient;
	healthClient: HealthAPIClient;
	cacheDriver: CacheDriver;
	observabilityDriver: ObservabilityDriver;
	searchDriver: SearchDriver;
	databaseDriver: DatabaseDriver;
	channelCreds: ChannelCredentials;
	private readonly _config: TigrisClientConfig;

	constructor(config: TigrisClientConfig) {
		const svcConfig: ServiceConfig = {
			loadBalancingConfig: [],
			methodConfig: [
				{
					name: [
						{
							service: "tigrisdata.v1.Tigris",
						},
						{
							service: "tigrisdata.search.v1.Search",
						},
					],
					waitForReady: true,
					retryPolicy: {
						maxAttempts: 3,
						initialBackoff: "0.1s",
						maxBackoff: "1.0s",
						backoffMultiplier: 1.5,
						retryableStatusCodes: [
							status.UNAVAILABLE,
							status.UNKNOWN,
							status.INTERNAL,
							status.RESOURCE_EXHAUSTED,
						],
					},
				},
			],
		};

		const grpcOptions: ClientOptions = {
			"grpc.service_config": JSON.stringify(svcConfig),
			"grpc.enable_retries": 1,
		};
		this._config = config;
		this.authClient = new AuthClient(config.serverUrl, grpc.credentials.createSsl());
		this.channelCreds = this.getChannelCreds(config);
		this.grpcClient = new TigrisClient(config.serverUrl, this.channelCreds);
		this.cacheDriver = new Cache(this._config, this.channelCreds);
		this.healthClient = new HealthAPIClient(config.serverUrl, this.channelCreds);
		this.observabilityDriver = new Observability(config, this.channelCreds);
		this.searchDriver = new Search(config, this.channelCreds);
		this.databaseDriver = new Database(config, this.channelCreds);
	}

	database(): DatabaseDriver {
		return this.databaseDriver;
	}

	collection<T>(): CollectionDriver<T> {
		return new GrpcCollectionDriver<T>(this._config, this.channelCreds);
	}

	observability(): ObservabilityDriver {
		return this.observabilityDriver;
	}

	cache(): CacheDriver {
		return this.cacheDriver;
	}

	search(): SearchDriver {
		return this.searchDriver;
	}

	getChannelCreds(config: TigrisClientConfig) {
		const defaultMetadata = new Metadata();
		defaultMetadata.set(USER_AGENT_KEY, USER_AGENT_VAL);
		defaultMetadata.set(DEST_NAME_KEY, config.serverUrl);

		if (this.isLocalServer(config)) {
			return grpc.credentials.createInsecure();
		} else if (config.clientId === undefined || config.clientSecret === undefined) {
			throw new Error("Both `clientId` and `clientSecret` are required");
		} else {
			const tokenSupplier = new TokenSupplier(config, this);
			return grpc.credentials.combineChannelCredentials(
				grpc.credentials.createSsl(),
				grpc.credentials.createFromMetadataGenerator((_params, callback) => {
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
		}
	}

	isLocalServer(config: TigrisClientConfig) {
		return (
			(config.serverUrl.includes("localhost") ||
				config.serverUrl.startsWith("tigris-local-server:") ||
				config.serverUrl.includes("127.0.0.1") ||
				config.serverUrl.includes("[::1]")) &&
			config.clientId === undefined &&
			config.clientSecret === undefined
		);
	}

	health(): Promise<string> {
		return new Promise((resolve, reject) => {
			this.healthClient.health(new ProtoHealthCheckInput(), (error, response) => {
				if (error) {
					return reject(error);
				}
				resolve(response.getResponse());
			});
		});
	}
	getAccessToken(clientId: string, clientSecret: string): Promise<string> {
		return new Promise<string>((resolve, reject) => {
			// refresh
			this.authClient.getAccessToken(
				new ProtoGetAccessTokenRequest()
					.setGrantType(GrantType.CLIENT_CREDENTIALS)
					.setClientId(clientId)
					.setClientSecret(clientSecret),
				(error, response) => {
					if (error) {
						reject(error);
					} else {
						const accessToken = response.getAccessToken();
						resolve(accessToken);
					}
				}
			);
		});
	}
}
