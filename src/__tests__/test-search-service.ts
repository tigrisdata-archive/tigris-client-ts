import { ISearchServer, SearchService } from "../proto/server/v1/search_grpc_pb";
import { sendUnaryData, ServerUnaryCall, ServerWritableStream } from "@grpc/grpc-js";
import {
	CreateByIdRequest,
	CreateByIdResponse,
	CreateDocumentRequest,
	CreateDocumentResponse,
	CreateOrReplaceDocumentRequest,
	CreateOrReplaceDocumentResponse,
	CreateOrUpdateIndexRequest,
	CreateOrUpdateIndexResponse,
	DeleteByQueryRequest,
	DeleteByQueryResponse,
	DeleteDocumentRequest,
	DeleteDocumentResponse,
	DeleteIndexRequest,
	DeleteIndexResponse,
	DocMeta,
	DocStatus,
	GetDocumentRequest,
	GetDocumentResponse,
	GetIndexRequest,
	GetIndexResponse,
	IndexDoc,
	IndexInfo,
	ListIndexesRequest,
	ListIndexesResponse,
	SearchIndexRequest,
	SearchIndexResponse,
	UpdateDocumentRequest,
	UpdateDocumentResponse,
} from "../proto/server/v1/search_pb";
import * as google_protobuf_timestamp_pb from "google-protobuf/google/protobuf/timestamp_pb";
import { Utility } from "../utility";
import { FacetCount, Page, SearchFacet, SearchMetadata } from "../proto/server/v1/api_pb";

export const SearchServiceFixtures = {
	Success: "validIndex",
	AlreadyExists: "existingIndex",
	DoesNotExist: "NoIndex",
	Docs: new Map([
		["1", { title: "नमस्ते to India", tags: ["travel"] }],
		["2", { title: "reliable systems 🙏", tags: ["it"] }],
	]),
	CreateIndex: {
		Blog: "blogPosts",
	},
	SearchDocs: {
		UpdatedAtSeconds: Math.floor(Date.now() / 1000),
	},
	GetDocs: {
		CreatedAtSeconds: 1672574400,
	},
};
const enc = new TextEncoder();

class TestSearchService {
	public impl: ISearchServer = {
		create(
			call: ServerUnaryCall<CreateDocumentRequest, CreateDocumentResponse>,
			callback: sendUnaryData<CreateDocumentResponse>
		): void {
			switch (call.request.getIndex()) {
				case SearchServiceFixtures.Success:
					const input: Object[] = call.request.getDocumentsList_asB64().map((d) => {
						return JSON.parse(Utility._base64Decode(d));
					});
					const response = new CreateDocumentResponse();
					input.forEach((i) => response.addStatus(new DocStatus().setId(i["title"])));
					callback(undefined, response);
					return;
				default:
					callback(new Error("Failed to update documents"));
					return;
			}
		},
		createById(
			call: ServerUnaryCall<CreateByIdRequest, CreateByIdResponse>,
			callback: sendUnaryData<CreateByIdResponse>
		): void {},
		createOrReplace(
			call: ServerUnaryCall<CreateOrReplaceDocumentRequest, CreateOrReplaceDocumentResponse>,
			callback: sendUnaryData<CreateOrReplaceDocumentResponse>
		): void {},
		delete(
			call: ServerUnaryCall<DeleteDocumentRequest, DeleteDocumentResponse>,
			callback: sendUnaryData<DeleteDocumentResponse>
		): void {
			const resp = new DeleteDocumentResponse();
			call.request.getIdsList().forEach((id) => resp.addStatus(new DocStatus().setId(id)));
			callback(undefined, resp);
			return;
		},
		deleteByQuery(
			call: ServerUnaryCall<DeleteByQueryRequest, DeleteByQueryResponse>,
			callback: sendUnaryData<DeleteByQueryResponse>
		): void {},
		get(
			call: ServerUnaryCall<GetDocumentRequest, GetDocumentResponse>,
			callback: sendUnaryData<GetDocumentResponse>
		): void {
			const resp = new GetDocumentResponse();
			call.request.getIdsList().forEach((id) => {
				const docAsString = JSON.stringify(SearchServiceFixtures.Docs.get(id));
				resp.addDocuments(
					new IndexDoc()
						.setDoc(enc.encode(docAsString))
						.setMetadata(
							new DocMeta().setCreatedAt(
								new google_protobuf_timestamp_pb.Timestamp().setSeconds(
									SearchServiceFixtures.GetDocs.CreatedAtSeconds
								)
							)
						)
				);
			});
			callback(undefined, resp);
			return;
		},
		search(call: ServerWritableStream<SearchIndexRequest, SearchIndexResponse>): void {
			const expectedUpdatedAt = new google_protobuf_timestamp_pb.Timestamp().setSeconds(
				SearchServiceFixtures.SearchDocs.UpdatedAtSeconds
			);
			const resp = new SearchIndexResponse();
			SearchServiceFixtures.Docs.forEach((d) =>
				resp.addHits(
					new IndexDoc()
						.setDoc(enc.encode(JSON.stringify(d)))
						.setMetadata(new DocMeta().setUpdatedAt(expectedUpdatedAt))
				)
			);
			resp.setMeta(
				new SearchMetadata()
					.setFound(5)
					.setTotalPages(5)
					.setPage(new Page().setSize(1).setCurrent(1))
			);
			resp
				.getFacetsMap()
				.set(
					"title",
					new SearchFacet().setCountsList([new FacetCount().setCount(2).setValue("Philosophy")])
				);
			call.write(resp);
			call.end();
		},
		update(
			call: ServerUnaryCall<UpdateDocumentRequest, UpdateDocumentResponse>,
			callback: sendUnaryData<UpdateDocumentResponse>
		): void {},
		createOrUpdateIndex(
			call: ServerUnaryCall<CreateOrUpdateIndexRequest, CreateOrUpdateIndexResponse>,
			callback: sendUnaryData<CreateOrUpdateIndexResponse>
		): void {
			switch (call.request.getName()) {
				case SearchServiceFixtures.Success:
					const response = new CreateOrUpdateIndexResponse()
						.setStatus("created")
						.setMessage("index created");
					callback(undefined, response);
					return;
				case SearchServiceFixtures.CreateIndex.Blog:
					const schema = Buffer.from(call.request.getSchema_asB64(), "base64").toString();
					expect(schema).toBe(
						'{"title":"blogPosts","type":"object","properties":{"text":{"type":"string","facet":true},"comments":{"type":"array","items":{"type":"string"}},"author":{"type":"string"},"createdAt":{"type":"string","format":"date-time","sort":true}}}'
					);
					const resp = new CreateOrUpdateIndexResponse()
						.setStatus("created")
						.setMessage("index created");
					callback(undefined, resp);
					return;
				case SearchServiceFixtures.AlreadyExists:
					callback(new Error("already exists"));
					return;
				default:
					callback(new Error("Server error"), undefined);
					return;
			}
		},
		getIndex(
			call: ServerUnaryCall<GetIndexRequest, GetIndexResponse>,
			callback: sendUnaryData<GetIndexResponse>
		): void {
			switch (call.request.getName()) {
				case SearchServiceFixtures.Success:
					const response = new GetIndexResponse().setIndex(
						new IndexInfo().setName(SearchServiceFixtures.Success)
					);
					callback(undefined, response);
					return;
				case SearchServiceFixtures.DoesNotExist:
					callback(new Error("search index not found"));
					return;
			}
		},
		deleteIndex(
			call: ServerUnaryCall<DeleteIndexRequest, DeleteIndexResponse>,
			callback: sendUnaryData<DeleteIndexResponse>
		): void {
			switch (call.request.getName()) {
				case SearchServiceFixtures.Success:
					const response = new DeleteIndexResponse()
						.setStatus("deleted")
						.setMessage("Index deleted");
					callback(undefined, response);
					return;
				case SearchServiceFixtures.DoesNotExist:
					callback(new Error("search index not found"));
					return;
			}
		},
		listIndexes(
			call: ServerUnaryCall<ListIndexesRequest, ListIndexesResponse>,
			callback: sendUnaryData<ListIndexesResponse>
		): void {
			const response = new ListIndexesResponse().setIndexesList([
				new IndexInfo().setName("i1"),
				new IndexInfo().setName("i2"),
			]);
			callback(undefined, response);
			return;
		},
	};
}

export default {
	service: SearchService,
	handler: new TestSearchService(),
};
