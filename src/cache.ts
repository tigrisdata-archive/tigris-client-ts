import {
	CacheDelResponse,
	CacheGetResponse,
	CacheGetSetResponse,
	CacheSetOptions,
	CacheSetResponse,
} from "./types";
import { CacheClient } from "./proto/server/v1/cache_grpc_pb";
import {
	DelRequest as ProtoDelRequest,
	GetRequest as ProtoGetRequest,
	KeysRequest as ProtoKeysRequest,
	SetRequest as ProtoSetRequest,
	GetSetRequest as ProtoGetSetRequest,
} from "./proto/server/v1/cache_pb";
import { Utility } from "./utility";
import { TigrisClientConfig } from "./tigris";

export class Cache {
	private readonly _projectName: string;
	private readonly _cacheName: string;
	private readonly _cacheClient: CacheClient;
	private readonly _config: TigrisClientConfig;

	constructor(
		projectName: string,
		cacheName: string,
		cacheClient: CacheClient,
		config: TigrisClientConfig
	) {
		this._projectName = projectName;
		this._cacheName = cacheName;
		this._cacheClient = cacheClient;
		this._config = config;
	}

	/**
	 * returns cache name
	 */
	public getCacheName(): string {
		return this._cacheName;
	}

	/**
	 * Sets the key with value. It will override the value if already exists
	 * @param key - key to set
	 * @param value - value for the key
	 * @param options - optionally set params.
	 * @example
	 * ```
	 * const c1 = tigris.GetCache("c1);
	 * const setResp = await c1.set("k1", "v1");
	 * console.log(setResp.status);
	 * ```
	 */
	public set(
		key: string,
		value: string | number | boolean | object,
		options?: CacheSetOptions
	): Promise<CacheSetResponse> {
		return new Promise<CacheSetResponse>((resolve, reject) => {
			const req = new ProtoSetRequest()
				.setProject(this._projectName)
				.setName(this._cacheName)
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

			this._cacheClient.set(req, (error, response) => {
				if (error) {
					reject(error);
				} else {
					resolve(new CacheSetResponse(response.getMessage()));
				}
			});
		});
	}

	/**
	 * Sets the key with value. And returns the old value (if exists)
	 *
	 * @param key - key to set
	 * @param value - value for the key
	 * @example
	 * ```
	 * const c1 = tigris.GetCache("c1);
	 * const getSetResp = await c1.getSet("k1", "v1");
	 * console.log(getSetResp.old_value);
	 * ```
	 */
	public getSet(
		key: string,
		value: string | number | boolean | object
	): Promise<CacheGetSetResponse> {
		return new Promise<CacheGetSetResponse>((resolve, reject) => {
			const req = new ProtoGetSetRequest()
				.setProject(this._projectName)
				.setName(this._cacheName)
				.setKey(key)
				.setValue(new TextEncoder().encode(Utility.objToJsonString(value as object)));

			this._cacheClient.getSet(req, (error, response) => {
				if (error) {
					reject(error);
				} else {
					if (response.getOldValue() !== undefined && response.getOldValue_asU8().length > 0) {
						resolve(
							new CacheGetSetResponse(
								response.getMessage(),
								Utility._base64DecodeToObject(response.getOldValue_asB64(), this._config)
							)
						);
					} else {
						resolve(new CacheGetSetResponse(response.getMessage()));
					}
				}
			});
		});
	}

	/**
	 * Get the value for the key, errors if the key doesn't exist or expired
	 *
	 * @param key - key to retrieve value for
	 * @example
	 * ```
	 * const c1 = tigris.GetCache("c1);
	 * const getResp = await c1.get("k1");
	 * console.log(getResp.value);
	 * ```
	 */
	public get(key: string): Promise<CacheGetResponse> {
		return new Promise<CacheGetResponse>((resolve, reject) => {
			this._cacheClient.get(
				new ProtoGetRequest().setProject(this._projectName).setName(this._cacheName).setKey(key),
				(error, response) => {
					if (error) {
						reject(error);
					} else {
						resolve(
							new CacheGetResponse(
								Utility._base64DecodeToObject(response.getValue_asB64(), this._config)
							)
						);
					}
				}
			);
		});
	}

	/**
	 * Deletes a key from cache
	 *
	 * @param key - key to delete
	 * @example
	 * ```
	 * const c1 = tigris.GetCache("c1);
	 * const delResp = await c1.del("k1");
	 * console.log(delResp.status);
	 * ```
	 */
	public del(key: string): Promise<CacheDelResponse> {
		return new Promise<CacheDelResponse>((resolve, reject) => {
			this._cacheClient.del(
				new ProtoDelRequest().setProject(this._projectName).setName(this._cacheName).setKey(key),
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

	/**
	 * returns an array of keys, complying the pattern
	 * @param pattern - optional argument to filter keys
	 * @example
	 * ```
	 * const c1 = tigris.GetCache("c1);
	 * const keys = await c1.keys();
	 * console.log(keys);
	 * ```
	 */
	public keys(pattern?: string): Promise<string[]> {
		return new Promise<string[]>((resolve, reject) => {
			const req = new ProtoKeysRequest().setProject(this._projectName).setName(this._cacheName);
			if (pattern !== undefined) {
				req.setPattern(pattern);
			}
			this._cacheClient.keys(req, (error, response) => {
				if (error) {
					reject(error);
				} else {
					resolve(response.getKeysList());
				}
			});
		});
	}
}
