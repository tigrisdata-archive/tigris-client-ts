import { RealTime, Channel } from "..";
import { WsTestServer } from "./test-server";

// TODO:
// 2. Subscribe recovery - last heard number
// 3. presence
// 4. logging

describe("realtime message send and receive", () => {
	let server: WsTestServer;

	beforeEach(async () => {
		server = new WsTestServer(9000);
		server.start();
	});

	afterEach(async () => {
		await server.close();
	});

	it("can send and receive", async () => {
		const realtime = new RealTime();
		await realtime.connect();
		try {
			return new Promise<void>(async (done) => {
				const channel1 = realtime.getChannel("test-one");

				channel1.subscribe("greeting", (message) => {
					expect(message).toEqual("hello world");
					expect(server.history().pop().eventType).toEqual("message");

					done();
				});

				await channel1.publish("greeting", "hello world");
			});
		} finally {
			realtime.close();
		}
	});

	it("can listen to specific messages only", async () => {
		const realtime = new RealTime();
		await realtime.connect();
		try {
			await new Promise<void>(async (done, reject) => {
				const channel1 = realtime.getChannel("test-one");

				channel1.subscribe("ch1", (message) => {
					expect(message).toEqual("hello world");
					done();
				});

				channel1.subscribe("ch2", (_message) => {
					reject("ch2 should not see message");
				});

				await waitForDelivery(channel1, "ch1", "hello world");
			});
		} finally {
			realtime.close();
		}
	});

	it("can subscribe and unsubscribe individual listener", async () => {
		let messageCount = 0;
		const realtime = new RealTime();
		await realtime.connect();
		const channel1 = realtime.getChannel("test-one");

		let cb = (_) => (messageCount += 1);

		channel1.subscribe("ch1", cb);
		await waitForDelivery(channel1, "ch1", "msg1");

		channel1.unsubscribe("ch1", cb);
		await waitForDelivery(channel1, "ch1", "msg2");

		try {
			expect(messageCount).toEqual(1);
		} finally {
			realtime.close();
		}
	});

	it("can unsubscribe all listeners", async () => {
		let messageCount = 0;
		const realtime = new RealTime();
		await realtime.connect();
		const channel1 = realtime.getChannel("test-one");

		channel1.subscribe("ch1", (_) => (messageCount += 1));
		channel1.subscribe("ch1", (_) => (messageCount += 1));
		channel1.subscribe("ch1", (_) => (messageCount += 1));
		channel1.subscribe("ch1", (_) => (messageCount += 1));

		await waitForDelivery(channel1, "ch1", "msg1");

		channel1.unsubscribeAll("ch1");

		await waitForDelivery(channel1, "ch1", "msg2");

		try {
			expect(messageCount).toEqual(4);
		} finally {
			realtime.close();
		}
	});

	it("sends heartbeat if no other message sent", async () => {
		const realtime = new RealTime();
		try {
			await realtime.connect();
			await sleep(1500);
			let msg = server.history().pop();

			expect(msg.eventType).toEqual("heartbeat");
		} finally {
			realtime.close();
		}
	});
});

async function waitForDelivery(channel: Channel, msgType: string, message: string) {
	await new Promise<void>(async (resolve) => {
		channel.subscribe(msgType, () => {
			resolve();
			channel.unsubscribe(msgType, resolve);
		});
		await channel.publish(msgType, message);
	});
}

const sleep = (time: number) => {
	return new Promise((resolve) => {
		setTimeout(resolve, time);
	});
};
