import { WebSocketServer } from "ws";

export class WsTestServer {
	private wss: WebSocketServer;

	constructor(port) {
		this.wss = new WebSocketServer({ port });
	}

	start() {
		this.wss.on("connection", (ws) => {
			ws.on("message", function message(data) {
				console.log("received: %s", data);
				ws.send(data);
			});

			// ws.send({ channel: "greeting", message: "hello" });
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
