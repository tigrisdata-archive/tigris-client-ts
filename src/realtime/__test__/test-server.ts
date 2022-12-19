import { WebSocketServer } from "ws";
import * as proto from "../../proto/server/v1/realtime_pb";

let socketId = 0;
let sessionId = 0;

function getSocketId() {
	socketId += 1;
	return socketId.toString();
}

function getSessionId() {
	sessionId += 1;
	return sessionId.toString();
}

export class WsTestServer {
	private wss: WebSocketServer;

	private _history: proto.RealTimeMessage.AsObject[];

	constructor(port) {
		this.wss = new WebSocketServer({ port });
		this._history = [];
	}

	start() {
		this.wss.on("connection", (ws) => {
			let connected = new proto.ConnectedMessage()
				.setEvent("connected")
				.setSocketId(getSocketId())
				.setSessionId(getSessionId());

			let msg = new proto.RealTimeMessage()
				.setEventType("connected")
				.setEvent(connected.serializeBinary());

			ws.send(msg.serializeBinary());

			ws.on("message", (data: Uint8Array) => {
				console.log("received: %s", data);
				let msg = proto.RealTimeMessage.deserializeBinary(data).toObject();
				this._history.push(msg);

				if (msg.eventType === "message") {
					ws.send(data);
				}
			});
		});
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
