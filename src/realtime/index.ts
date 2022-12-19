import { TigrisClientConfig } from "../tigris";
// this needs to go in its own file
import { EventEmitter } from "node:events";
import { Transport } from "./transport";
import { MessageEvent } from "./messages";

type SubscribeCallback = (string) => void;

export interface RealTimeConfig {
	/*
	 * An id used to identify this client when using the presence feature.
	 * If the client id is not set, an error will be thrown when using any presence features
	 */
	clientId?: string;
}

export class RealTime {
	private _config: RealTimeConfig;
	private channelManager: ChannelManager;
	private transport: Transport;
	constructor(config: RealTimeConfig = {}) {
		this.transport = new Transport();
		this.channelManager = new ChannelManager(this.transport);

		this._config = config;
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

class Presence extends EventEmitter {
	constructor() {
		super();
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
