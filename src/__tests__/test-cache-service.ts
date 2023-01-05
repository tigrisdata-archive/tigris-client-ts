import { CacheService, ICacheServer } from "../proto/server/v1/cache_grpc_pb";
import { sendUnaryData, ServerUnaryCall } from "@grpc/grpc-js";
import {
	CacheMetadata,
	CreateCacheRequest,
	CreateCacheResponse,
	DeleteCacheRequest,
	DeleteCacheResponse,
	DelResponse,
	GetRequest,
	GetResponse,
	KeysRequest,
	KeysResponse,
	ListCachesRequest,
	ListCachesResponse,
	SetRequest,
	SetResponse,
} from "../proto/server/v1/cache_pb";
import { DelRequest } from "../../dist/proto/server/v1/cache_pb";
import { Utility } from "../utility";

export class TestCacheService {
	private static CACHE_MAP = new Map<string, Map<string, string>>();

	static reset() {
		TestCacheService.CACHE_MAP.clear();
	}
	public impl: ICacheServer = {
		createCache(
			call: ServerUnaryCall<CreateCacheRequest, CreateCacheResponse>,
			callback: sendUnaryData<CreateCacheResponse>
		): void {
			const cacheName = call.request.getProject() + "_" + call.request.getName();
			if (TestCacheService.CACHE_MAP.has(cacheName)) {
				callback(new Error(), undefined);
			} else {
				TestCacheService.CACHE_MAP.set(cacheName, new Map<string, string>());
				callback(
					undefined,
					new CreateCacheResponse().setStatus("created").setMessage("Cache created successfully")
				);
			}
		},
		del(
			call: ServerUnaryCall<DelRequest, DelResponse>,
			callback: sendUnaryData<DelResponse>
		): void {
			const cacheName = call.request.getProject() + "_" + call.request.getName();
			if (TestCacheService.CACHE_MAP.has(cacheName)) {
				if (TestCacheService.CACHE_MAP.get(cacheName).has(call.request.getKey())) {
					TestCacheService.CACHE_MAP.get(cacheName).delete(call.request.getKey());
					callback(
						undefined,
						new DelResponse().setStatus("deleted").setMessage("Deleted key count# 1")
					);
				}
			} else {
				callback(new Error("cache does not exist"), undefined);
			}
		},
		deleteCache(
			call: ServerUnaryCall<DeleteCacheRequest, DeleteCacheResponse>,
			callback: sendUnaryData<DeleteCacheResponse>
		): void {
			const cacheName = call.request.getProject() + "_" + call.request.getName();
			if (TestCacheService.CACHE_MAP.has(cacheName)) {
				TestCacheService.CACHE_MAP.delete(cacheName);
				callback(
					undefined,
					new DeleteCacheResponse().setStatus("deleted").setMessage("Deleted cache")
				);
			} else {
				callback(new Error("cache does not exist"), undefined);
			}
		},
		get(
			call: ServerUnaryCall<GetRequest, GetResponse>,
			callback: sendUnaryData<GetResponse>
		): void {
			const cacheName = call.request.getProject() + "_" + call.request.getName();
			if (TestCacheService.CACHE_MAP.has(cacheName)) {
				if (TestCacheService.CACHE_MAP.get(cacheName).has(call.request.getKey())) {
					const value = TestCacheService.CACHE_MAP.get(cacheName).get(call.request.getKey());
					callback(undefined, new GetResponse().setValue(value));
				} else {
					callback(new Error("cache key does not exist"), undefined);
				}
			} else {
				callback(new Error("cache does not exist"), undefined);
			}
		},
		keys(
			call: ServerUnaryCall<KeysRequest, KeysResponse>,
			callback: sendUnaryData<KeysResponse>
		): void {
			const cacheName = call.request.getProject() + "_" + call.request.getName();
			if (TestCacheService.CACHE_MAP.has(cacheName)) {
				const result: Array<string> = new Array<string>();
				for (let key of TestCacheService.CACHE_MAP.get(cacheName).keys()) {
					result.push(key);
				}
				callback(undefined, new KeysResponse().setKeysList(result));
			} else {
				callback(new Error("cache does not exist"), undefined);
			}
		},
		listCaches(
			call: ServerUnaryCall<ListCachesRequest, ListCachesResponse>,
			callback: sendUnaryData<ListCachesResponse>
		): void {
			const result: Array<CacheMetadata> = new Array<CacheMetadata>();
			for (let key of TestCacheService.CACHE_MAP.keys()) {
				if (key.startsWith(call.request.getProject()))
					result.push(
						new CacheMetadata().setName(key.replace(call.request.getProject() + "_", ""))
					);
			}
			callback(undefined, new ListCachesResponse().setCachesList(result));
		},
		set(
			call: ServerUnaryCall<SetRequest, SetResponse>,
			callback: sendUnaryData<SetResponse>
		): void {
			const cacheName = call.request.getProject() + "_" + call.request.getName();
			if (TestCacheService.CACHE_MAP.has(cacheName)) {
				TestCacheService.CACHE_MAP.get(cacheName).set(
					call.request.getKey(),
					call.request.getValue_asB64()
				);
				callback(undefined, new SetResponse().setStatus("set").setMessage("set" + " successfully"));
			} else {
				callback(new Error("cache does not exist"), undefined);
			}
		},
	};
}

export default {
	service: CacheService,
	handler: new TestCacheService(),
};
