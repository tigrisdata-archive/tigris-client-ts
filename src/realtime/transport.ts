import {
	connectedMessage,
	messageEvent,
	publishMessage,
	realTimeMessage,
	heartbeatMessage,
	MessageEvent,
} from "./messages";
import { WebSocket } from "ws";
import * as proto from "../proto/server/v1/realtime_pb";

type MessageEventListener = (MessageEvent: MessageEvent) => void;
interface TransportConfig {
	heartbeatTimeout: number;
}

interface Session {
	sessionId: string;
	socketId: string;
}

type ConnectionState = "failed" | "connecting" | "connected" | "uninitialized";

export class Transport {
	private listeners: Map<string, MessageEventListener[]>;
	private ws: WebSocket;
	private session: Session;
	private _isConnected: Promise<void>;
	private _connectionState: ConnectionState = "uninitialized";
	private heartbeatId: number | NodeJS.Timeout;
	private config: TransportConfig;

	constructor(config: TransportConfig = { heartbeatTimeout: 1000 }) {
		this.config = config;
		this.listeners = new Map();
		this.ws = new WebSocket("ws://127.0.0.1:9000");
		this.ws.binaryType = "arraybuffer";

		let connectionResolved = () => {};

		this._isConnected = new Promise((resolve) => {
			connectionResolved = resolve;
		});

		this.ws.on("open", () => {
			this.restartHeartbeat();
		});

		this.ws.on("message", (data: Uint8Array) => {
			const msg = realTimeMessage(data);

			switch (msg.eventType) {
				case proto.EventType.CONNECTED:
					this.session = connectedMessage(msg.event);

					connectionResolved();
					this._connectionState = "connected";

					console.log("connected with", this.session);
					return;

				case proto.EventType.MESSAGE:
					let channelMsg = messageEvent(msg.event);
					this.handleChannelMessage(channelMsg);
					return;
				default:
					throw new Error(`unknown message type ${msg.eventType}`);
			}
		});
	}

	restartHeartbeat() {
		clearTimeout(this.heartbeatId);
		this.heartbeatId = setTimeout(() => this.sendHeartbeat(), this.config.heartbeatTimeout);
	}

	send(msg: Uint8Array) {
		this.ws.send(msg);
	}

	sendHeartbeat() {
		this.restartHeartbeat();
		this.ws.send(heartbeatMessage());
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
		this.send(msg);
	}

	// Returns the connection session socket id
	socketId(): string | undefined {
		return this.session?.sessionId;
	}

	close() {
		clearTimeout(this.heartbeatId);
		this.ws.close();
	}
}
