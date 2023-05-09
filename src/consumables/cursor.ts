import { IterableStream, Initializer } from "./iterable-stream";
import { ReadRequest, ReadResponse } from "../proto/server/v1/api_pb";
import { TigrisClient } from "../proto/server/v1/api_grpc_pb";
import { Session } from "../session";
import { Utility } from "../utility";
import { ClientReadableStream } from "@grpc/grpc-js";
import { TigrisClientConfig } from "../tigris";
import { KeysRequest, KeysResponse } from "../proto/server/v1/cache_pb";
import { CacheClient } from "../proto/server/v1/cache_grpc_pb";

/** @internal */
export class ReadCursorInitializer implements Initializer<ReadResponse> {
	private readonly _client: TigrisClient;
	private readonly _request: ReadRequest;
	private readonly _session: Session;

	constructor(client: TigrisClient, request: ReadRequest, tx: Session) {
		this._client = client;
		this._request = request;
		this._session = tx;
	}

	init(): ClientReadableStream<ReadResponse> {
		return this._client.read(this._request, Utility.txToMetadata(this._session));
	}
}

/** @internal */
export class CacheKeysCursorInitializer implements Initializer<KeysResponse> {
	private readonly _client: CacheClient;
	private readonly _request: KeysRequest;

	constructor(client: CacheClient, request: KeysRequest) {
		this._client = client;
		this._request = request;
	}

	init(): ClientReadableStream<KeysResponse> {
		return this._client.keys(this._request);
	}
}

/**
 * Cursor to supplement find() queries
 */
export class Cursor<T> extends IterableStream<T, ReadResponse> {
	/** @internal */
	private readonly _config: TigrisClientConfig;

	constructor(initializer: ReadCursorInitializer, config: TigrisClientConfig) {
		super(initializer);
		this._config = config;
	}

	/** @override */
	protected _transform(message: ReadResponse): T {
		return Utility.jsonStringToObj<T>(Utility._base64Decode(message.getData_asB64()), this._config);
	}
}

/**
 * Cursor to supplement keys() call for cache
 */
export class CacheKeysCursor extends IterableStream<string[], KeysResponse> {
	/** @internal */

	constructor(initializer: CacheKeysCursorInitializer) {
		super(initializer);
	}

	/** @override */
	protected _transform(message: KeysResponse): string[] {
		return message.getKeysList();
	}
}
