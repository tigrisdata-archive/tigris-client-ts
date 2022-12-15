import { TigrisClientConfig } from "../tigris";
// this needs to go in its own file
import { WebSocket } from "ws";
import { EventEmitter } from "node:events";
import { FlowNode } from "typescript";

type SubscribeCallback = (message: string) => void;

export class RealTime {
	// private _config: TigrisClientConfig;
	private channelManager: ChannelManager;
	private transport: Transport;
	constructor() {
		this.transport = new Transport();
		this.channelManager = new ChannelManager(this.transport);
		// this._config = config;
	}

	async connect() {}

	getChannel(name: string): Channel {
		return this.channelManager.getOrCreate(name);
	}

	// closes websocket connection
	close() {
		this.channelManager.close();
		this.transport.close();
	}
}

class Transport {
	private listeners: Map<string, SubscribeCallback[]>;
	private ws: WebSocket;

	constructor() {
		this.listeners = new Map();
		this.ws = new WebSocket("ws://127.0.0.1:9000");

		this.ws.on("message", (data) => {
			let d = String(data);
			let { channel, msgType, message } = JSON.parse(d);
			console.log("t - recieved", channel, msgType, message);

			let listeners = this.listeners.get(channel);

			if (!listeners) {
				return;
			}

			listeners.forEach((listener) => listener(message));
		});
	}

	listen(channelName: string, listener: SubscribeCallback) {
		if (!this.listeners.has(channelName)) {
			this.listeners.set(channelName, []);
		}

		let channelListeners = this.listeners.get(channelName);
		channelListeners.push(listener);
	}

	publish(channel: string, msgType: string, message: string) {
		this.ws.send(JSON.stringify({ channel, msgType, message }));
	}

	close() {
		this.ws.close();
	}
}

// for browser support we can use https://github.com/primus/eventemitter3
class Channel extends EventEmitter {
	private name: string;
	private hasAttached: boolean;
	private transport: Transport;

	constructor(name: string, transport: Transport) {
		super();
		this.hasAttached = false;
		this.name = name;
		this.transport = transport;
	}

	subscribe(msgType: string, cb: SubscribeCallback) {
		if (!this.hasAttached) {
			this.attach();
		}

		// TODO: make sure we do not see double if we detach and then attach

		this.on(msgType, cb);
	}

	attach() {
		this.transport.listen(this.name, (msg) => this.notify(msg));
		this.hasAttached = true;
		// this.transport.attach("");
	}

	detach() {
		this.hasAttached = false;
	}

	publish(msgType: string, data: string) {
		this.transport.publish(this.name, msgType, data);
	}

	notify(msg: string) {
		console.log("notify", msg);
		this.emit("greeting", msg);
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
	}
}

/*
    Notes:

    * Might need an async func to connect to server
        * `async realtime() -> Promise<RealTime>
    * Browser vs nodejs websocket
    * 


*/
