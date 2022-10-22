import { ClientReadableStream } from "@grpc/grpc-js";
import { Readable } from "node:stream";

function _next<T, TResp>(
	stream: ClientReadableStream<TResp>,
	transform: (arg: TResp) => T
): AsyncIterableIterator<T> {
	const iter: () => AsyncIterableIterator<T> = async function* () {
		for await (const message of stream) {
			yield transform(message);
		}
		return;
	};

	return iter();
}

// Utility to convert grpc response streams to Readable streams
export function clientReadableToStream<T, TResp>(
	stream: ClientReadableStream<TResp>,
	transform: (arg: TResp) => T
): Readable {
	return Readable.from(_next(stream, transform));
}
