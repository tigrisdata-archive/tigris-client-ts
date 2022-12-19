import { WebSocketServer, WebSocket } from "ws";
import * as proto from "../../proto/server/v1/realtime_pb";

let socketId = 0;
let sessionId = 0;
let seq = 0;

function getSocketId() {
	socketId += 1;
	return socketId.toString();
}

function getSessionId() {
	sessionId += 1;
	return sessionId.toString();
}

function getSeq() {
	seq += 1;
	return seq.toString();
}

export class WsTestServer {
	private wss: WebSocketServer;
	private clients: Map<string, WebSocket>;

	private _history: proto.RealTimeMessage.AsObject[];

	constructor(port) {
		this.wss = new WebSocketServer({ port });
		this.clients = new Map();
		this._history = [];
	}

	start() {
		this.wss.on("connection", (ws) => {
			let socketId = getSocketId();
			this.clients.set(socketId, ws);
			let connected = new proto.ConnectedMessage()
				.setEvent("connected")
				.setSocketId(socketId)
				.setSessionId(getSessionId());

			let msg = new proto.RealTimeMessage()
				.setEventType(proto.EventType.CONNECTED)
				.setEvent(connected.serializeBinary());

			ws.send(msg.serializeBinary());

			ws.on("message", (data: Uint8Array) => {
				console.log("received: %s", data);
				let msg = proto.RealTimeMessage.deserializeBinary(data).toObject();
				this._history.push(msg);

				if (msg.eventType === proto.EventType.MESSAGE) {
					this.clients.forEach((client) => client.send(data));
				}
			});
		});
	}

	closeConnection(sessionId: string) {
		let ws = this.clients.get(sessionId);

		if (!ws) {
			return;
		}

		ws.close();
	}

	history() {
		return this._history;
	}

	async close(): Promise<void> {
		return new Promise((resolve, reject) => {
			this.wss.close((err) => {
				console.log("close", err);
				if (err) {
					console.log("ERR", err);
					reject(err);
				} else {
					resolve();
				}
			});
		});
	}
}
