import { Initializer, IterableStream } from "./iterable-stream";
import {
	SearchRequest as ProtoSearchRequest,
	SearchResponse as ProtoSearchResponse,
} from "../proto/server/v1/api_pb";

import { TigrisClient } from "../proto/server/v1/api_grpc_pb";
import { ClientReadableStream } from "@grpc/grpc-js";
import { TigrisClientConfig } from "../tigris";
import {
	SearchIndexResponse as ProtoSearchIndexResponse,
	SearchIndexRequest as ProtoSearchIndexRequest,
} from "../proto/server/v1/search_pb";
import { SearchClient } from "../proto/server/v1/search_grpc_pb";
import { SearchResult } from "../search";

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

/** @internal */
export class SearchIndexIteratorInitializer implements Initializer<ProtoSearchIndexResponse> {
	private readonly _client: SearchClient;
	private readonly _request: ProtoSearchIndexRequest;

	constructor(client: SearchClient, request: ProtoSearchIndexRequest) {
		this._client = client;
		this._request = request;
	}
	init(): ClientReadableStream<ProtoSearchIndexResponse> {
		return this._client.search(this._request);
	}
}

/**
 * Iterator to supplement search() queries
 */
export class SearchIterator<T> extends IterableStream<
	SearchResult<T>,
	ProtoSearchResponse | ProtoSearchIndexResponse
> {
	/** @internal */
	private readonly _config: TigrisClientConfig;

	constructor(
		initializer: SearchIteratorInitializer | SearchIndexIteratorInitializer,
		config: TigrisClientConfig
	) {
		super(initializer);
		this._config = config;
	}

	/** @override */
	protected _transform(message: ProtoSearchResponse | ProtoSearchIndexResponse): SearchResult<T> {
		return SearchResult.from(message, this._config);
	}
}
