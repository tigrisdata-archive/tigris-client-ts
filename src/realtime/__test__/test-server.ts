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

	constructor(port) {
		this.wss = new WebSocketServer({ port });
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

			console.log("boom", connected.toObject());
			ws.send(msg.serializeBinary());

			ws.on("message", function (data: Uint8Array) {
				console.log("received: %s", data);
				let a = proto.RealTimeMessage.deserializeBinary(data).toObject();
				let b = proto.MessageEvent.deserializeBinary(a.event as Uint8Array).toObject();
				console.log(b.data);
				//@ts-ignore
				let z = Buffer.from(b.data, "base64").toString("utf-8");
				console.log("z", z);

				ws.send(data);
			});
		});
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
