import * as grpc from "@grpc/grpc-js";
import { TigrisClient } from "./proto/server/v1/api_grpc_pb";
import * as server_v1_api_pb from "./proto/server/v1/api_pb";
import {
	SubscribeRequest as ProtoSubscribeRequest,
	SubscribeRequestOptions as ProtoSubscribeRequestOptions,
	SubscribeResponse as ProtoSubscribeResponse,
	PublishRequest as ProtoPublishRequest,
	PublishRequestOptions as ProtoPublishRequestOptions,
} from "./proto/server/v1/api_pb";
import { PublishOptions, SubscribeOptions, TigrisTopicType } from "./types";
import { Utility } from "./utility";

export interface SubscribeCallback<T> {
	onNext(message: T): void;

	onEnd(): void;

	onError(error: Error): void;
}

export class Topic<T extends TigrisTopicType> {
	private readonly _topicName: string;
	private readonly _db: string;
	private readonly _grpcClient: TigrisClient;

	constructor(topicName: string, db: string, grpcClient: TigrisClient) {
		this._topicName = topicName;
		this._db = db;
		this._grpcClient = grpcClient;
	}

	get topicName(): string {
		return this._topicName;
	}

	publishMany(messages: Array<T>, options?: PublishOptions): Promise<Array<T>> {
		return new Promise<Array<T>>((resolve, reject) => {
			const messagesArray = new Array<Uint8Array>();
			const textEncoder = new TextEncoder();
			for (const message of messages) {
				messagesArray.push(textEncoder.encode(Utility.objToJsonString(message)));
			}

			const protoRequest = new ProtoPublishRequest()
				.setDb(this._db)
				.setCollection(this._topicName)
				.setMessagesList(messagesArray);

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
								Utility.uint8ArrayToString(value)
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

	subscribe(callback: SubscribeCallback<T>, options?: SubscribeOptions): void {
		const subscribeRequest = new ProtoSubscribeRequest()
			.setDb(this._db)
			.setCollection(this._topicName);

		if (options) {
			subscribeRequest.setOptions(
				new ProtoSubscribeRequestOptions().setPartitionsList(options.partitions)
			);
		}

		const stream: grpc.ClientReadableStream<ProtoSubscribeResponse> =
			this._grpcClient.subscribe(subscribeRequest);

		stream.on("data", (subscribeResponse: ProtoSubscribeResponse) => {
			const message: T = Utility.jsonStringToObj<T>(
				Utility._base64Decode(subscribeResponse.getMessage_asB64())
			);
			callback.onNext(message);
		});

		stream.on("error", (error) => callback.onError(error));
		stream.on("end", () => callback.onEnd());
	}

	subscribeToPartitions(callback: SubscribeCallback<T>, partitions: Array<number>): void {
		return this.subscribe(callback, new SubscribeOptions(partitions));
	}
}
