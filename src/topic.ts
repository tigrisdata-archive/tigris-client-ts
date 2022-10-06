import * as grpc from "@grpc/grpc-js";
import { TigrisClient } from "./proto/server/v1/api_grpc_pb";
import * as server_v1_api_pb from "./proto/server/v1/api_pb";
import {
	PublishRequest as ProtoPublishRequest,
	PublishRequestOptions as ProtoPublishRequestOptions,
	SubscribeRequest as ProtoSubscribeRequest,
	SubscribeRequestOptions as ProtoSubscribeRequestOptions,
	SubscribeResponse as ProtoSubscribeResponse,
} from "./proto/server/v1/api_pb";
import { Filter, PublishOptions, SubscribeOptions, TigrisTopicType } from "./types";
import { Utility } from "./utility";
import { TigrisClientConfig } from "./tigris";
import { Readable } from "node:stream";
import { clientReadableToStream } from "./consumables/utils";

/**
 * Callback to receive events for a topic from server
 */
export interface SubscribeCallback<T> {
	/**
	 * Receives a message from server. Can be called many times but is never called after
	 * {@link onError} or {@link onEnd} are called.
	 *
	 * @param message
	 */
	onNext(message: T): void;

	/**
	 * Receives a notification of successful stream completion.
	 *
	 * <p>May only be called once and if called it must be the last method called. In particular,
	 * if an exception is thrown by an implementation of {@link onEnd} no further calls to any
	 * method are allowed.
	 */
	onEnd(): void;

	/**
	 * Receives terminating error from the stream.
	 * @param err
	 */
	onError(err: Error): void;
}

/**
 * The **Topic** class represents a events stream in Tigris.
 */
export class Topic<T extends TigrisTopicType> {
	private readonly _topicName: string;
	private readonly _db: string;
	private readonly _grpcClient: TigrisClient;
	private readonly config: TigrisClientConfig;

	constructor(topicName: string, db: string, grpcClient: TigrisClient, config: TigrisClientConfig) {
		this._topicName = topicName;
		this._db = db;
		this._grpcClient = grpcClient;
		this.config = config;
	}

	/**
	 * Name of this topic
	 */
	get topicName(): string {
		return this._topicName;
	}

	/**
	 * Publish multiple events to the topic
	 *
	 * @param messages - Array of events to publish
	 * @param {PublishOptions} options - Optional publishing options
	 *
	 * @example Publish messages to topic
	 *```
	 * const tigris = new Tigris(config);
	 * const topic = tigris.getDatabase("my_db").getTopic("my_topic");
	 * const messages = [new Message(1), new Message(2)];
	 * topic.publishMany(messages)
	 * 		.then(result => console.log(result))
	 * 		.catch(err => console.log(err));
	 * ```
	 * @returns Promise of published messages
	 */
	publishMany(messages: Array<T>, options?: PublishOptions): Promise<Array<T>> {
		return new Promise<Array<T>>((resolve, reject) => {
			const messagesUintArray = new Array<Uint8Array>();
			const textEncoder = new TextEncoder();
			for (const message of messages) {
				messagesUintArray.push(textEncoder.encode(Utility.objToJsonString(message)));
			}

			const protoRequest = new ProtoPublishRequest()
				.setDb(this._db)
				.setCollection(this._topicName)
				.setMessagesList(messagesUintArray);

			if (options) {
				protoRequest.setOptions(new ProtoPublishRequestOptions().setPartition(options.partition));
			}

			this._grpcClient.publish(
				protoRequest,
				(error: grpc.ServiceError, response: server_v1_api_pb.PublishResponse): void => {
					if (error !== undefined && error !== null) {
						reject(error);
					} else {
						let messageIndex = 0;
						const clonedMessages: T[] = Object.assign([], messages);

						for (const value of response.getKeysList_asU8()) {
							const keyValueJsonObj: object = Utility.jsonStringToObj(
								Utility.uint8ArrayToString(value),
								this.config
							);
							for (const fieldName of Object.keys(keyValueJsonObj)) {
								Reflect.set(clonedMessages[messageIndex], fieldName, keyValueJsonObj[fieldName]);
								messageIndex++;
							}
						}
						resolve(clonedMessages);
					}
				}
			);
		});
	}

	/**
	 * Publish a single message to topic
	 *
	 * @example Publish a message to topic
	 *```
	 * const tigris = new Tigris(config);
	 * const topic = tigris.getDatabase("my_db").getTopic("my_topic");
	 * topic.publish(new Message(1))
	 * 		.then(result => console.log(result))
	 * 		.catch(err => console.log(err));
	 *```

	 * @param message - Message to publish
	 * @param {PublishOptions} options - Optional publishing options
	 *
	 * @returns Promise of the published message
	 */
	publish(message: T, options?: PublishOptions): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			const messageArr: Array<T> = new Array<T>();
			messageArr.push(message);
			this.publishMany(messageArr, options)
				.then((messages) => {
					resolve(messages[0]);
				})
				.catch((error) => {
					reject(error);
				});
		});
	}

	/**
	 * Subscribe to listen for messages in a topic. Users can consume messages in one of two ways:
	 * 1. By providing an optional {@link SubscribeCallback} as param
	 * 2. By consuming {@link Readable} stream when  no callback is provided
	 *
	 * @example Subscribe using callback
	 *```
	 * const tigris = new Tigris(config);
	 * const topic = tigris.getDatabase("my_db").getTopic("my_topic");
	 *
	 * topic.subscribe({
	 * 		onNext(message: T) {
	 * 		 	console.log(message);
	 * 		},
	 * 		onError(err: Error) {
	 * 		 	console.log(error);
	 * 		},
	 * 		onEnd() {
	 * 		 	console.log("All messages consumed");
	 * 		}
	 * });
	 *```
	 *
	 * @example Subscribe using {@link Readable} stream if callback is omitted
	 *```
	 * const tigris = new Tigris(config);
	 * const topic = tigris.getDatabase("my_db").getTopic("my_topic");
	 * const stream = topic.subscribe() as Readable;
	 *
	 * stream.on("data", (message: T) => console.log(message));
	 * stream.on("error", (err: Error) => console.log(err));
	 * stream.on("end", () => console.log("All messages consumed"));
	 *```
	 *
	 * @param {SubscribeCallback} callback - Optional callback to consume messages
	 * @param {SubscribeOptions} options - Optional subscription options
	 *
	 * @returns {Readable} if no callback is provided, else nothing is returned
	 */
	subscribe(callback?: SubscribeCallback<T>, options?: SubscribeOptions): Readable | void {
		return this.subscribeWithFilter(undefined, callback, options);
	}

	/**
	 * Subscribe to listen for messages in a topic that match given filter. Users can consume
	 * messages in one of two ways:
	 * 1. By providing an optional {@link SubscribeCallback} as param
	 * 2. By consuming {@link Readable} stream when  no callback is provided
	 *
	 * @example Subscribe using callback
	 *```
	 * const tigris = new Tigris(config);
	 * const topic = tigris.getDatabase("my_db").getTopic("my_topic");
	 * const balanceLessThanThreshold = {
	 * 		op: SelectorFilterOperator.LT,
	 * 		fields: {
	 * 		 	balance: 200
	 * 		}
	 * };
	 *
	 * topic.subscribeWithFilter(
	 * 		balanceLessThanThreshold,
	 * 		{
	 * 			onNext(message: T) {
	 * 		 		console.log(message);
	 * 			},
	 * 			onError(err: Error) {
	 * 		 		console.log(error);
	 * 			},
	 * 			onEnd() {
	 * 		 		console.log("All messages consumed");
	 * 			}
	 * 		}
	 * );
	 *```
	 *
	 * @example Subscribe using {@link Readable} stream if callback is omitted
	 *```
	 * const tigris = new Tigris(config);
	 * const topic = tigris.getDatabase("my_db").getTopic("my_topic");
	 * const balanceLessThanThreshold = {
	 * 		op: SelectorFilterOperator.LT,
	 * 		fields: {
	 * 		 	balance: 200
	 * 		}
	 * };
	 * const stream = topic.subscribe(balanceLessThanThreshold) as Readable;
	 *
	 * stream.on("data", (message: T) => console.log(message));
	 * stream.on("error", (err: Error) => console.log(err));
	 * stream.on("end", () => console.log("All messages consumed"));
	 *```
	 *
	 * @param {Filter} filter - Subscription will only return messages that match this query
	 * @param {SubscribeCallback} callback - Optional callback to consume messages
	 * @param {SubscribeOptions} options - Optional subscription options
	 *
	 * @returns {Readable} if no callback is provided, else nothing is returned
	 */
	subscribeWithFilter(
		filter: Filter<T>,
		callback?: SubscribeCallback<T>,
		options?: SubscribeOptions
	): Readable | void {
		const subscribeRequest = new ProtoSubscribeRequest()
			.setDb(this._db)
			.setCollection(this._topicName);

		if (filter !== undefined) {
			subscribeRequest.setFilter(Utility.stringToUint8Array(Utility.filterToString(filter)));
		}

		if (options) {
			subscribeRequest.setOptions(
				new ProtoSubscribeRequestOptions().setPartitionsList(options.partitions)
			);
		}

		const transform: (ProtoSubscribeResponse) => T = (resp: ProtoSubscribeResponse) => {
			return Utility.jsonStringToObj<T>(
				Utility._base64Decode(resp.getMessage_asB64()),
				this.config
			);
		};

		const stream: grpc.ClientReadableStream<ProtoSubscribeResponse> =
			this._grpcClient.subscribe(subscribeRequest);

		if (callback !== undefined) {
			stream.on("data", (subscribeResponse: ProtoSubscribeResponse) => {
				callback.onNext(transform(subscribeResponse));
			});

			stream.on("error", (error) => callback.onError(error));
			stream.on("end", () => callback.onEnd());
		} else {
			return clientReadableToStream<T, ProtoSubscribeResponse>(stream, transform);
		}
	}

	subscribeToPartitions(
		partitions: Array<number>,
		callback?: SubscribeCallback<T>
	): Readable | void {
		return this.subscribeWithFilterToPartitions(undefined, partitions, callback);
	}

	subscribeWithFilterToPartitions(
		filter: Filter<T>,
		partitions: Array<number>,
		callback?: SubscribeCallback<T>
	): Readable | void {
		return this.subscribeWithFilter(filter, callback, new SubscribeOptions(partitions));
	}
}
