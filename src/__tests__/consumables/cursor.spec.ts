import { Server, ServerCredentials } from "@grpc/grpc-js";
import TestService, { TestTigrisService } from "../test-service";
import { TigrisService } from "../../proto/server/v1/api_grpc_pb";
import { IBook } from "../tigris.rpc.spec";
import { Tigris } from "../../tigris";
import { CursorInUseError } from "../../error";
import { ObservabilityService } from "../../proto/server/v1/observability_grpc_pb";
import TestObservabilityService from "../test-observability-service";
import { DB } from "../../db";

describe("class FindCursor", () => {
	let server: Server;
	const SERVER_PORT = 5003;
	let db: DB;

	beforeAll(async () => {
		server = new Server();
		TestTigrisService.reset();
		server.addService(TigrisService, TestService.handler.impl);
		server.addService(ObservabilityService, TestObservabilityService.handler.impl);
		server.bindAsync(
			"localhost:" + SERVER_PORT,
			// test purpose only
			ServerCredentials.createInsecure(),
			(err: Error | null) => {
				if (err) {
					console.log(err);
				} else {
					server.start();
				}
			}
		);
		const tigris = new Tigris({ serverUrl: "localhost:" + SERVER_PORT, projectName: "db3" });
		const dbPromise = tigris.getDatabase();
		db = await dbPromise;
		return dbPromise;
	});

	beforeEach(() => {
		TestTigrisService.reset();
	});

	afterAll((done) => {
		server.forceShutdown();
		done();
	});

	it("returns iterable stream as it is", async () => {
		const cursor = db.getCollection<IBook>("books").findMany();
		let bookCounter = 0;
		for await (const book of cursor) {
			expect(book.id).toBeDefined();
			bookCounter++;
		}
		expect(bookCounter).toBeGreaterThan(0);
	});

	it("Pipes the stream as iterable", async () => {
		const cursor = db.getCollection<IBook>("books").findMany();
		let bookCounter = 0;
		for await (const book of cursor.stream()) {
			expect(book.id).toBeDefined();
			bookCounter++;
		}
		expect(bookCounter).toBeGreaterThan(0);
	});

	it("returns stream as an array", () => {
		const cursor = db.getCollection<IBook>("books").findMany();
		const booksPromise = cursor.toArray();
		booksPromise.then((books) => expect(books.length).toBeGreaterThan(0));

		return booksPromise;
	});

	it("does not allow cursor to be re-used", () => {
		const cursor = db.getCollection<IBook>("books").findMany();
		// cursor is backed by is a generator fn, calling next() would retrieve item from stream
		cursor[Symbol.asyncIterator]().next();
		expect(() => cursor.toArray()).toThrow(CursorInUseError);
	});

	it("allows cursor to be re-used once reset", async () => {
		const cursor = db.getCollection<IBook>("books").findMany();

		let bookCounter = 0;
		for await (const book of cursor.stream()) {
			expect(book.id).toBeDefined();
			bookCounter++;
		}

		cursor.reset();
		const books = await cursor.toArray();
		expect(books.length).toBe(bookCounter);
	});
});
