// import { OpenApiClient } from "../http/v1";
import Driver, {
	CacheDriver,
	CollectionDriver,
	DatabaseDriver,
	ObservabilityDriver,
	SearchDriver,
} from "./driver";
// import {
// 	CreateOrUpdateCollectionRequest,
// 	GetAccessTokenRequest,
// 	GetAccessTokenResponse,
// } from "../http/v1";
import { TigrisClientConfig } from "../tigris";
import { DeleteCacheResponse, ListCachesResponse } from "../types";

export class HttpDriver implements Driver {
	// private client: OpenApiClient;
	constructor(config: TigrisClientConfig) {
		// this.client = new OpenApiClient({
		// 	BASE: config.serverUrl,
		// 	USERNAME: config.clientId,
		// 	PASSWORD: config.clientSecret,
		// });
	}
	collection<T>(): CollectionDriver<T> {
		throw new Error("Method not implemented.");
	}
	database(): DatabaseDriver {
		throw new Error("Method not implemented.");
	}
	search(): SearchDriver {
		throw new Error("Method not implemented.");
	}
	observability(): ObservabilityDriver {
		throw new Error("Method not implemented.");
	}
	cache(): CacheDriver {
		throw new Error("Method not implemented.");
	}
	listCaches(): Promise<ListCachesResponse> {
		throw new Error("Method not implemented.");
	}
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	deleteCache(name: string): Promise<DeleteCacheResponse> {
		throw new Error("Method not implemented.");
	}
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	createCache(name: string): Promise<void> {
		throw new Error("Method not implemented.");
	}
	health(): Promise<string> {
		throw new Error("Method not implemented.");
	}
	async getAccessToken(clientId: string, clientSecret: string): Promise<string> {
		throw new Error("Method not implemented.");
		// const request: GetAccessTokenRequest = {
		// 	grant_type: "CLIENT_CREDENTIALS",
		// 	client_id: clientId,
		// 	client_secret: clientSecret,
		// };
		// const resp = (await this.client.authentication.authGetAccessToken(
		// 	request
		// )) as GetAccessTokenResponse;
		// return resp.access_token;
	}

	async createOrUpdateCollection(
		project: string,
		branch: string,
		coll: string,
		only_create: boolean,
		schema: string
	): Promise<void> {
		throw new Error("Method not implemented.");
		// const body: CreateOrUpdateCollectionRequest = {
		// 	branch,
		// 	schema: Utility.stringToUint8Array(schema),
		// 	only_create,
		// };

		// await this.client.collections.tigrisCreateOrUpdateCollection(project, coll, body);
	}
}
