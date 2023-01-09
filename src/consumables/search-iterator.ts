import { Initializer, IterableStream } from "./iterable-stream";
import {
	SearchRequest as ProtoSearchRequest,
	SearchResponse as ProtoSearchResponse,
} from "../proto/server/v1/api_pb";
import { TigrisClient } from "../proto/server/v1/api_grpc_pb";
import { ClientReadableStream } from "@grpc/grpc-js";
import { SearchResult } from "../search/types";
import { TigrisClientConfig } from "../tigris";

/** @internal */
export class SearchIteratorInitializer implements Initializer<ProtoSearchResponse> {
	private readonly _client: TigrisClient;
	private readonly _request: ProtoSearchRequest;

	constructor(client: TigrisClient, request: ProtoSearchRequest) {
		this._client = client;
		this._request = request;
	}

	init(): ClientReadableStream<ProtoSearchResponse> {
		return this._client.search(this._request);
	}
}

/**
 * Iterator to supplement search() queries
 */
export class SearchIterator<T> extends IterableStream<SearchResult<T>, ProtoSearchResponse> {
	/** @internal */
	private readonly _config: TigrisClientConfig;

	constructor(initializer: SearchIteratorInitializer, config: TigrisClientConfig) {
		super(initializer);
		this._config = config;
	}

	/** @override */
	protected _transform(message: ProtoSearchResponse): SearchResult<T> {
		return SearchResult.from(message, this._config);
	}
}
