import { Server } from "@grpc/grpc-js";
import { RealTime } from "..";
import { WsTestServer } from "./test-server";

const sleep = (time: number) => {
	return new Promise((resolve) => {
		setTimeout(resolve, time);
	});
};

describe("realtime tests", () => {
	let server: WsTestServer;

	beforeEach(async () => {
		server = new WsTestServer(9000);
		server.start();
	});

	afterEach(async () => {
		await server.close();
	});

	it("can work", async () => {
		return new Promise(async (done) => {
			const realtime = new RealTime();
			await sleep(100);

			const channel1 = realtime.getChannel("test-one");

			channel1.subscribe("greeting", (message) => {
				console.log("chan", message);
				expect(message).toEqual("hello-boom");
				done(true);
			});

			channel1.publish("greeting", "hello-boom");

			realtime.close();
		});
	});
});
