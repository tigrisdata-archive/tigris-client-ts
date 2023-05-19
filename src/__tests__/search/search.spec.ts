import {
	Search,
	SearchField,
	SearchIndex,
	TigrisIndexSchema,
	TigrisSearchIndex,
} from "../../search";
import { capture, instance, mock, reset } from "ts-mockito";
import { SearchClient as ProtoSearchClient } from "../../proto/server/v1/search_grpc_pb";
import { CreateOrUpdateIndexResponse as ProtoCreateIndexResponse } from "../../proto/server/v1/search_pb";
import { Utility } from "../../utility";
import { TigrisDataTypes } from "../../types";
import { Status as ProtoStatus } from "@grpc/grpc-js/build/src/constants";
import { ServiceError } from "@grpc/grpc-js";
import { Search as SearchGrpc } from "../../driver/grpc/search";
import { TigrisClient } from "../../proto/server/v1/api_grpc_pb";

describe("Search", () => {
	let target: Search;
	let mockClient: ProtoSearchClient;
	const config = { projectName: "test_project", serverUrl: "http://127.0.0.1" };

	beforeEach(() => {
		mockClient = mock(ProtoSearchClient);
		let s = new SearchGrpc(config, undefined);
		s.client = instance(mockClient);
		s.tigrisClient = instance(mock(TigrisClient));
		target = new Search(s, config);
	});

	afterEach(() => {
		reset(mockClient);
	});

	describe("createOrUpdateIndex", () => {
		const decoratedModelName = "decorated_model";
		@TigrisSearchIndex(decoratedModelName)
		class Book {
			@SearchField()
			name: string;
		}

		const IBook: TigrisIndexSchema<Book> = {
			name: {
				type: TigrisDataTypes.STRING,
				searchIndex: true,
			},
		};

		it("creates index using decorated model class", async () => {
			const expectedSchema = JSON.stringify({
				title: decoratedModelName,
				type: "object",
				properties: {
					name: {
						type: "string",
						searchIndex: true,
					},
				},
			});

			const resp = target.createOrUpdateIndex(Book);
			// verifies that grpc gets invoked with the right arguments
			const [capturedReq, capturedCallback] = capture(mockClient.createOrUpdateIndex).last();
			// @ts-ignore
			capturedCallback(null, new ProtoCreateIndexResponse());

			expect(capturedReq.getName()).toBe(decoratedModelName);
			expect(capturedReq.getProject()).toBe(target.projectName);
			expect(capturedReq.getOnlyCreate()).toBe(false);
			expect(Utility.uint8ArrayToString(capturedReq.getSchema_asU8())).toBe(expectedSchema);

			return expect(resp).resolves.toBeInstanceOf(SearchIndex);
		});

		it("creates index using decorated model and specified name", async () => {
			const overridenName = "my_custom_name";
			const expectedSchema = JSON.stringify({
				title: overridenName,
				type: "object",
				properties: {
					name: {
						type: "string",
						searchIndex: true,
					},
				},
			});
			const resp = target.createOrUpdateIndex(overridenName, Book);
			// verifies that grpc gets invoked with the right arguments
			const [capturedReq, capturedCallback] = capture(mockClient.createOrUpdateIndex).last();
			// @ts-ignore
			capturedCallback(null, new ProtoCreateIndexResponse());

			expect(capturedReq.getName()).toBe(overridenName);
			expect(capturedReq.getProject()).toBe(target.projectName);
			expect(capturedReq.getOnlyCreate()).toBe(false);
			expect(Utility.uint8ArrayToString(capturedReq.getSchema_asU8())).toBe(expectedSchema);

			return expect(resp).resolves.toBeInstanceOf(SearchIndex);
		});

		it("creates index using interface schema", async () => {
			const expectedIndexName = "interface_schema";
			const expectedSchema = JSON.stringify({
				title: expectedIndexName,
				type: "object",
				properties: {
					name: {
						type: "string",
						searchIndex: true,
					},
				},
			});
			const resp = target.createOrUpdateIndex(expectedIndexName, IBook);
			// verifies that grpc gets invoked with the right arguments
			const [capturedReq, capturedCallback] = capture(mockClient.createOrUpdateIndex).last();
			// @ts-ignore
			capturedCallback(null, new ProtoCreateIndexResponse());

			expect(capturedReq.getName()).toBe(expectedIndexName);
			expect(capturedReq.getProject()).toBe(target.projectName);
			expect(capturedReq.getOnlyCreate()).toBe(false);
			expect(Utility.uint8ArrayToString(capturedReq.getSchema_asU8())).toBe(expectedSchema);

			return expect(resp).resolves.toBeInstanceOf(SearchIndex);
		});

		it("fails when underlying grpc throws error", async () => {
			const expectedError: ServiceError = {
				details: "",
				metadata: undefined,
				name: "",
				code: ProtoStatus.INVALID_ARGUMENT,
				message: "invalid schema",
			};
			const resp = target.createOrUpdateIndex(Book);
			const [capturedReq, capturedCallback] = capture(mockClient.createOrUpdateIndex).last();
			// @ts-ignore
			capturedCallback(expectedError, new ProtoCreateIndexResponse());

			expect(capturedReq.getSchema()).toBeDefined();
			return expect(resp).rejects.toStrictEqual(expectedError);
		});
	});
});
