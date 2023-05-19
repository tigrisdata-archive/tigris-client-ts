import * as proto from "google-protobuf";
import { ClientReadableStream } from "@grpc/grpc-js";
import { CursorInUseError } from "../../../error";
import { Readable } from "stream";
import { IterableCursor } from "src/types";

/** @internal */
export interface Initializer<TResp extends proto.Message> {
	init(): ClientReadableStream<TResp>;
}

/** @internal */
const tStream = Symbol("stream");
/** @internal */
const tReady = Symbol("ready");
/** @internal */
const tClosed = Symbol("closed");

export abstract class GrpcIterableStream<T, TResp extends proto.Message>
	implements IterableCursor<T>
{
	/** @internal */
	[tStream]: ClientReadableStream<TResp>;
	/** @internal */
	[tReady]: boolean;
	/** @internal */
	[tClosed]: boolean;
	/** @internal */
	private _initializer: Initializer<TResp>;

	/** @internal */
	protected constructor(initializer: Initializer<TResp>) {
		this._initializer = initializer;
		this[tReady] = false;
		this._initialize();
		this[tClosed] = false;
	}

	/** @internal */
	private _assertNotInUse() {
		if (this[tClosed]) {
			throw new CursorInUseError();
		}
		this[tClosed] = true;
	}

	/** @internal */
	private async *next(): AsyncIterableIterator<T> {
		this._assertNotInUse();
		for await (const message of this[tStream]) {
			yield this._transform(message);
		}
		return;
	}

	/**
	 * Returns a {@link Readable} stream of documents to iterate on
	 *
	 * @example
	 * ```
	 * const cursor = myCollection.find();
	 * for await (const doc of cursor.stream()) {
	 *     console.log(doc);
	 * }
	 *```
	 *
	 * @throws {@link TigrisCursorInUseError} - if cursor is being consumed or has been consumed.
	 * @see {@link reset} to re-use a cursor.
	 */
	stream(): Readable {
		return Readable.from(this.next());
	}

	/**
	 * Returns an async iterator to iterate on documents
	 *
	 * @example
	 * ```
	 * const cursor = myCollection.find();
	 * for await (const doc of cursor) {
	 *     console.log(doc);
	 * }
	 *```
	 *
	 * @throws {@link TigrisCursorInUseError} - if cursor is being consumed or has been consumed.
	 * @see {@link reset} to re-use a cursor.
	 */
	[Symbol.asyncIterator](): AsyncIterableIterator<T> {
		return this.next()[Symbol.asyncIterator]();
	}

	/**
	 * Returns an array of documents. The caller is responsible for making sure that there
	 * is enough memory to store the results.
	 *
	 * @throws {@link TigrisCursorInUseError} - if cursor is being consumed or has been consumed.
	 * @see {@link reset} to re-use a cursor.
	 */
	toArray(): Promise<Array<T>> {
		this._assertNotInUse();
		const buffer = new Array<T>();

		return new Promise<Array<T>>((resolve, reject) => {
			this[tStream].on("data", (message: TResp) => {
				buffer.push(this._transform(message));
			});
			this[tStream].on("error", reject);
			this[tStream].on("end", () => resolve(buffer));
		});
	}

	/** Converts a message from stream to user consumable object */
	protected abstract _transform(message: TResp): T;

	/** @internal */
	private _initialize(): void {
		if (!this[tReady]) {
			this[tStream] = this._initializer.init();
			this[tReady] = true;
		}
	}

	/**
	 * This essentially sends a new query to server and allows the cursor to be re-used. A new
	 * query to server is sent even if this cursor is not yet consumed.
	 *
	 * <b>Note:</b> A cursor may yield different results after `reset()`
	 */
	reset(): void {
		this[tClosed] = false;
		this[tReady] = false;
		this._initialize();
	}
}
