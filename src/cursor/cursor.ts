import { AbstractCursor, Initializer } from "./abstract-cursor";
import { ReadRequest, ReadResponse } from "../proto/server/v1/api_pb";
import { TigrisClient } from "../proto/server/v1/api_grpc_pb";
import { Session } from "../session";
import { Utility } from "../utility";
import { ClientReadableStream } from "@grpc/grpc-js";
import { TigrisClientConfig } from "../tigris";

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

/**
 * Cursor to supplement find() queries
 */
export class Cursor<T> extends AbstractCursor<T, ReadResponse> {
	/** @internal */
	private readonly _config: TigrisClientConfig;

	constructor(initializer: ReadCursorInitializer, config: TigrisClientConfig) {
		super(initializer);
		this._config = config;
	}

	/** @override */
	_transform(message: ReadResponse): T {
		return Utility.jsonStringToObj<T>(Utility._base64Decode(message.getData_asB64()), this._config);
	}
}
