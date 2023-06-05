import { CacheDriver } from "../driver";
import { Utility } from "../../utility";
import { ChannelCredentials, ClientOptions } from "@grpc/grpc-js";
import {
	DelRequest as ProtoDelRequest,
	GetRequest as ProtoGetRequest,
	GetSetRequest as ProtoGetSetRequest,
	KeysRequest as ProtoKeysRequest,
	SetRequest as ProtoSetRequest,
} from "../../proto/server/v1/cache_pb";
import {
	CreateCacheRequest as ProtoCreateCacheRequest,
	DeleteCacheRequest as ProtoDeleteCacheRequest,
	ListCachesRequest as ProtoListCachesRequest,
} from "../../proto/server/v1/cache_pb";
import { TigrisClientConfig } from "../../tigris";
import { CacheClient } from "../../proto/server/v1/cache_grpc_pb";
import { Status } from "@grpc/grpc-js/build/src/constants";
import {
	CacheDelResponse,
	CacheGetResponse,
	CacheGetSetResponse,
	CacheMetadata,
	CacheSetOptions,
	CacheSetResponse,
	DeleteCacheResponse,
	ListCachesResponse,
} from "../../types";
import { CacheKeysCursor, CacheKeysCursorInitializer } from "./consumables/cursor";

export class Cache implements CacheDriver {
	cacheClient: CacheClient;
	config: TigrisClientConfig;
	constructor(
		config: TigrisClientConfig,
		channelCredentials: ChannelCredentials,
		opts: ClientOptions
	) {
		this.config = config;
		this.cacheClient = new CacheClient(config.serverUrl, channelCredentials, opts);
	}
	get(cacheName: string, key: string): Promise<CacheGetResponse> {
		return new Promise<CacheGetResponse>((resolve, reject) => {
			this.cacheClient.get(
				new ProtoGetRequest().setProject(this.config.projectName).setName(cacheName).setKey(key),
				(error, response) => {
					if (error) {
						reject(error);
					} else {
						resolve(
							new CacheGetResponse(
								Utility._base64DecodeToObject(response.getValue_asB64(), this.config)
							)
						);
					}
				}
			);
		});
	}

	del(cacheName: string, key: string): Promise<CacheDelResponse> {
		return new Promise<CacheDelResponse>((resolve, reject) => {
			this.cacheClient.del(
				new ProtoDelRequest().setProject(this.config.projectName).setName(cacheName).setKey(key),
				(error, response) => {
					if (error) {
						reject(error);
					} else {
						resolve(new CacheDelResponse(response.getStatus(), response.getMessage()));
					}
				}
			);
		});
	}

	// TODO: Fix
	keys(cacheName: string, pattern?: string): CacheKeysCursor {
		const req = new ProtoKeysRequest().setProject(this.config.projectName).setName(cacheName);
		if (pattern !== undefined) {
			req.setPattern(pattern);
		}
		this.cacheClient.keys(req);
		const initializer = new CacheKeysCursorInitializer(this.cacheClient, req);
		return new CacheKeysCursor(initializer);
	}

	getSet(
		cacheName: string,
		key: string,
		value: string | number | boolean | object
	): Promise<CacheGetSetResponse> {
		return new Promise<CacheGetSetResponse>((resolve, reject) => {
			const req = new ProtoGetSetRequest()
				.setProject(this.config.projectName)
				.setName(cacheName)
				.setKey(key)
				.setValue(new TextEncoder().encode(Utility.objToJsonString(value as object)));

			this.cacheClient.getSet(req, (error, response) => {
				if (error) {
					reject(error);
				} else {
					if (response.getOldValue() !== undefined && response.getOldValue_asU8().length > 0) {
						resolve(
							new CacheGetSetResponse(
								response.getMessage(),
								Utility._base64DecodeToObject(response.getOldValue_asB64(), this.config)
							)
						);
					} else {
						resolve(new CacheGetSetResponse(response.getMessage()));
					}
				}
			});
		});
	}

	set(
		cacheName: string,
		key: string,
		value: string | number | boolean | object,
		options?: CacheSetOptions
	): Promise<CacheSetResponse> {
		return new Promise<CacheSetResponse>((resolve, reject) => {
			const req = new ProtoSetRequest()
				.setProject(this.config.projectName)
				.setName(cacheName)
				.setKey(key)
				.setValue(new TextEncoder().encode(Utility.objToJsonString(value as object)));

			if (options !== undefined && options.ex !== undefined) {
				req.setEx(options.ex);
			}
			if (options !== undefined && options.px !== undefined) {
				req.setPx(options.px);
			}
			if (options !== undefined && options.nx !== undefined) {
				req.setNx(options.nx);
			}
			if (options !== undefined && options.xx !== undefined) {
				req.setXx(options.xx);
			}

			this.cacheClient.set(req, (error, response) => {
				if (error) {
					reject(error);
				} else {
					resolve(new CacheSetResponse(response.getMessage()));
				}
			});
		});
	}

	createCache(name: string): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			this.cacheClient.createCache(
				new ProtoCreateCacheRequest().setProject(this.config.projectName).setName(name),
				(error) => {
					if (error && error.code != Status.ALREADY_EXISTS) {
						reject(error);
					} else {
						resolve();
					}
				}
			);
		});
	}

	deleteCache(name: string): Promise<DeleteCacheResponse> {
		return new Promise<DeleteCacheResponse>((resolve, reject) => {
			this.cacheClient.deleteCache(
				new ProtoDeleteCacheRequest().setProject(this.config.projectName).setName(name),
				(error, response) => {
					if (error) {
						reject(error);
					} else {
						resolve(new DeleteCacheResponse(response.getMessage()));
					}
				}
			);
		});
	}

	listCaches(): Promise<ListCachesResponse> {
		return new Promise<ListCachesResponse>((resolve, reject) => {
			this.cacheClient.listCaches(
				new ProtoListCachesRequest().setProject(this.config.projectName),
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
}
