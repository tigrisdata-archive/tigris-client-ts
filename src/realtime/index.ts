import { TigrisClientConfig } from "../tigris";
// this needs to go in its own file
import { WebSocket } from "ws";
import { EventEmitter } from "node:events";
import * as proto from "../proto/server/v1/realtime_pb";
import { connectedMessage, messageEvent, publishMessage, realTimeMessage } from "./messages";

type SubscribeCallback = (string) => void;
type MessageEvent = proto.MessageEvent.AsObject;
type MessageEventListener = (MessageEvent: MessageEvent) => void;

export class RealTime {
	// private _config: TigrisClientConfig;
	private channelManager: ChannelManager;
	private transport: Transport;
	constructor() {
		this.transport = new Transport();
		this.channelManager = new ChannelManager(this.transport);

		// this._config = config;
	}

	async connect() {
		await this.transport.isConnected();
	}

	getChannel(name: string): Channel {
		return this.channelManager.getOrCreate(name);
	}

	close() {
		this.channelManager.close();
		this.transport.close();
	}
}

interface Session {
	sessionId: string;
	socketId: string;
}

type ConnectionState = "failed" | "connecting" | "connected" | "uninitialized";

class Transport {
	private listeners: Map<string, MessageEventListener[]>;
	private ws: WebSocket;
	private session: Session;
	private _isConnected: Promise<void>;
	private _connectionState: ConnectionState = "uninitialized";

	constructor() {
		this.listeners = new Map();
		this.ws = new WebSocket("ws://127.0.0.1:9000");
		this.ws.binaryType = "arraybuffer";

		let connectionResolved = () => {};

		this._isConnected = new Promise((resolve) => {
			connectionResolved = resolve;
		});

		this.ws.on("message", (data: Uint8Array) => {
			const msg = realTimeMessage(data);

			switch (msg.eventType) {
				case "connected":
					this.session = connectedMessage(msg.event);

					connectionResolved();
					this._connectionState = "connected";

					console.log("connected with", this.session);
					return;

				case "message":
					let channelMsg = messageEvent(msg.event);
					this.handleChannelMessage(channelMsg);
					return;
				default:
					throw new Error(`unknown message type ${msg.eventType}`);
			}
		});
	}

	connectionState(): ConnectionState {
		return this._connectionState;
	}

	handleChannelMessage(msg: MessageEvent) {
		const listeners = this.listeners.get(msg.channel);
		msg.data = Buffer.from(msg.data as string, "base64").toString("utf8");

		listeners.forEach((listener) => listener(msg));
	}

	isConnected(): Promise<void> {
		return this._isConnected;
	}

	listen(channelName: string, listener: MessageEventListener) {
		if (!this.listeners.has(channelName)) {
			this.listeners.set(channelName, []);
		}

		const channelListeners = this.listeners.get(channelName);
		channelListeners.push(listener);
	}

	async publish(channel: string, name: string, message: string) {
		const msg = publishMessage(channel, name, message);
		this.ws.send(msg);
	}

	close() {
		this.ws.close();
	}
}

export class Channel extends EventEmitter {
	private name: string;
	private hasAttached: boolean;
	private transport: Transport;

	constructor(name: string, transport: Transport) {
		super();
		this.hasAttached = false;
		this.name = name;
		this.transport = transport;
	}

	subscribe(msgName: string, cb: SubscribeCallback) {
		if (!this.hasAttached) {
			this.attach();
		}

		this.on(msgName, cb);
	}

	unsubscribe(msgName: string, cb: SubscribeCallback) {
		this.off(msgName, cb);
	}

	unsubscribeAll(msgName: string) {
		this.removeAllListeners(msgName);
	}

	attach() {
		this.transport.listen(this.name, (msg: MessageEvent) => this.notify(msg));
		this.hasAttached = true;
	}

	detach() {
		this.hasAttached = false;
	}

	async publish(msgName: string, data: string) {
		await this.transport.publish(this.name, msgName, data);
	}

	notify(msg: MessageEvent) {
		console.log("notify", msg);
		this.emit(msg.name, msg.data);
	}
}

class ChannelManager {
	channels: Map<string, Channel>;
	transport: Transport;

	constructor(transport: Transport) {
		this.channels = new Map<string, Channel>();
		this.transport = transport;
	}

	getOrCreate(name): Channel {
		if (!this.channels.has(name)) {
			this.channels.set(name, new Channel(name, this.transport));
		}

		return this.channels.get(name);
	}

	close() {
		this.channels.forEach((channel) => channel.detach());
		this.channels.clear();
	}
}

/*
    Notes:

    * Browser vs nodejs websocket
	* Fix message body encoding
*/
