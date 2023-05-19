import {
	CacheDelResponse,
	CacheGetResponse,
	CacheGetSetResponse,
	CacheSetOptions,
	CacheSetResponse,
} from "./types";

import { CacheKeysCursor } from "./driver/grpc/consumables/cursor";
import { CacheDriver } from "./driver/driver";

export class Cache {
	private readonly _cacheName: string;
	private readonly _driver: CacheDriver;

	constructor(_projectName: string, cacheName: string, driver: CacheDriver) {
		this._cacheName = cacheName;
		this._driver = driver;
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
		return this._driver.set(this._cacheName, key, value, options);
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
		return this._driver.getSet(this._cacheName, key, value);
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
		return this._driver.get(this._cacheName, key);
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
		return this._driver.del(this._cacheName, key);
	}

	/**
	 * returns an array of keys, complying the pattern
	 * @param pattern - optional argument to filter keys
	 * @example
	 * ```
	 * const c1 = tigris.GetCache("c1);
	 * const keysCursor = await c1.keys();
	 * for await (const keys of keysCursor) {
	 *	console.log(keys);
	 * }
	 * ```
	 */
	public keys(pattern?: string): CacheKeysCursor {
		return this._driver.keys(this._cacheName, pattern);
	}
}
