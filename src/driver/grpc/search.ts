import { SearchDriver } from "../driver";
import { Utility } from "../../utility";
import { TigrisClient } from "../../proto/server/v1/api_grpc_pb";
import * as grpc from "@grpc/grpc-js";
import { ChannelCredentials } from "@grpc/grpc-js";
import {
	SearchRequest as ProtoSearchRequest,
	SearchResponse as ProtoSearchResponse,
	FacetCount as ProtoFacetCount,
	FacetStats as ProtoFacetStats,
	Page as ProtoSearchPage,
	SearchFacet as ProtoSearchFacet,
	SearchHit as ProtoSearchHit,
	SearchHitMeta as ProtoSearchHitMeta,
	SearchMetadata as ProtoSearchMetadata,
	Match as ProtoMatch,
	GroupedSearchHits,
} from "../../proto/server/v1/api_pb";
import {
	CreateDocumentRequest as ProtoCreateDocumentRequest,
	CreateOrReplaceDocumentRequest as ProtoSearchReplaceRequest,
	DeleteByQueryRequest as ProtoDeleteByQueryRequest,
	DeleteDocumentRequest as ProtoDeleteDocumentRequest,
	GetDocumentRequest as ProtoGetDocumentRequest,
	SearchIndexRequest as ProtoSearchIndexRequest,
	SearchIndexResponse as ProtoSearchIndexResponse,
	UpdateDocumentRequest as ProtoUpdateDocumentRequest,
	CreateOrUpdateIndexRequest as ProtoCreateIndexRequest,
	DeleteIndexRequest as ProtoDeleteIndexRequest,
	ListIndexesRequest as ProtoListIndexesRequest,
	DocStatus as ProtoDocStatus,
} from "../../proto/server/v1/search_pb";
import { TigrisClientConfig } from "../../tigris";
import {
	DocMeta,
	DocStatus,
	FacetCount,
	FacetCountDistribution,
	FacetStats,
	Facets,
	IndexInfo,
	IndexedDoc,
	Page,
	SearchCursor,
	SearchIterator,
	SearchMeta,
	SearchQuery,
	SearchResult,
	TextMatchInfo,
} from "../../search";
import { SearchClient } from "../../proto/server/v1/search_grpc_pb";
import {
	SearchIndexIteratorInitializer,
	SearchIteratorInitializer,
} from "./consumables/search-iterator";
import { TigrisError } from "../../error";
import { TigrisCollectionType } from "../../types";

export class Search implements SearchDriver {
	client: SearchClient;
	tigrisClient: TigrisClient;
	config: TigrisClientConfig;
	constructor(
		config: TigrisClientConfig,
		channelCredentials: ChannelCredentials | undefined,
		opts: grpc.ClientOptions
	) {
		this.config = config;
		// TODO: to remove later this is for testing
		if (channelCredentials) {
			this.client = new SearchClient(config.serverUrl, channelCredentials, opts);
			this.tigrisClient = new TigrisClient(config.serverUrl, channelCredentials, opts);
		}
	}

	getClient() {
		return this.client;
	}

	createOrUpdateIndex(index: string, schema: Uint8Array): Promise<string> {
		const createOrUpdateIndexRequest = new ProtoCreateIndexRequest()
			.setProject(this.config.projectName)
			.setName(index)
			.setSchema(schema);
		return new Promise<string>((resolve, reject) => {
			this.client.createOrUpdateIndex(createOrUpdateIndexRequest, (error, response) => {
				if (error) {
					reject(error);
					return;
				}
				resolve(response.getMessage());
			});
		});
	}
	listIndexes(): Promise<IndexInfo[]> {
		const listIndexRequest = new ProtoListIndexesRequest().setProject(this.config.projectName);
		return new Promise<Array<IndexInfo>>((resolve, reject) => {
			this.client.listIndexes(listIndexRequest, (error, response) => {
				if (error) {
					reject(error);
					return;
				}
				resolve(
					response.getIndexesList().map((i) => IndexInfo.from(i.getName(), i.getSchema_asB64()))
				);
			});
		});
	}
	deleteIndex(name: string): Promise<string> {
		const deleteIndexRequest = new ProtoDeleteIndexRequest()
			.setProject(this.config.projectName)
			.setName(name);

		return new Promise<string>((resolve, reject) => {
			this.client.deleteIndex(deleteIndexRequest, (error, response) => {
				if (error) {
					reject(error);
					return;
				}
				resolve(response.getMessage());
			});
		});
	}

	createMany(name: string, docs: Uint8Array[]): Promise<DocStatus[]> {
		return new Promise<DocStatus[]>((resolve, reject) => {
			const createRequest = new ProtoCreateDocumentRequest()
				.setProject(this.config.projectName)
				.setIndex(name)
				.setDocumentsList(docs);
			this.client.create(createRequest, (error, response) => {
				if (error) {
					reject(error);
					return;
				}
				resolve(toDocStatus(response.getStatusList()));
			});
		});
	}
	createOrReplaceMany(name: string, docs: Uint8Array[]): Promise<DocStatus[]> {
		return new Promise<Array<DocStatus>>((resolve, reject) => {
			const replaceRequest = new ProtoSearchReplaceRequest()
				.setProject(this.config.projectName)
				.setIndex(name)
				.setDocumentsList(docs);

			this.client.createOrReplace(replaceRequest, (error, response) => {
				if (error) {
					reject(error);
					return;
				}
				resolve(toDocStatus(response.getStatusList()));
			});
		});
	}
	deleteMany(name: string, ids: string[]): Promise<DocStatus[]> {
		return new Promise<Array<DocStatus>>((resolve, reject) => {
			const delRequest = new ProtoDeleteDocumentRequest()
				.setProject(this.config.projectName)
				.setIndex(name)
				.setIdsList(ids);
			this.client.delete(delRequest, (error, response) => {
				if (error) {
					reject(error);
					return;
				}
				resolve(toDocStatus(response.getStatusList()));
			});
		});
	}
	deleteByQuery(name: string, filter: Uint8Array): Promise<number> {
		return new Promise<number>((resolve, reject) => {
			const delRequest = new ProtoDeleteByQueryRequest()
				.setProject(this.config.projectName)
				.setIndex(name)
				.setFilter(filter);

			this.client.deleteByQuery(delRequest, (error, response) => {
				if (error) {
					reject(error);
					return;
				}
				resolve(response.getCount());
			});
		});
	}
	getMany<T>(name: string, ids: string[]): Promise<IndexedDoc<T>[]> {
		return new Promise<Array<IndexedDoc<T>>>((resolve, reject) => {
			const getRequest = new ProtoGetDocumentRequest()
				.setProject(this.config.projectName)
				.setIndex(name)
				.setIdsList(ids);
			this.client.get(getRequest, (error, response) => {
				if (error) {
					reject(error);
					return;
				}
				const docs: IndexedDoc<T>[] = response.getDocumentsList().map((d) => {
					return toIndexedDoc(d, this.config);
				});
				resolve(docs);
			});
		});
	}
	updateMany(name: string, docs: Uint8Array[]): Promise<DocStatus[]> {
		return new Promise<Array<DocStatus>>((resolve, reject) => {
			const updateRequest = new ProtoUpdateDocumentRequest()
				.setProject(this.config.projectName)
				.setDocumentsList(docs)
				.setIndex(name);

			this.client.update(updateRequest, (error, response) => {
				if (error) {
					reject(error);
				}
				resolve(toDocStatus(response.getStatusList()));
			});
		});
	}

	searchCollection<T>(
		db: string,
		branch: string,
		collectionName: string,
		query: SearchQuery<T>,
		page?: number
	): SearchCursor<T> | Promise<SearchResult<T>> {
		const searchRequest = new ProtoSearchRequest()
			.setProject(db)
			.setBranch(branch)
			.setCollection(collectionName);

		Utility.protoSearchRequestFromQuery(query, searchRequest, page);

		// return a iterator if no explicit page number is specified
		if (typeof page === "undefined") {
			const initializer = new SearchIteratorInitializer(this.tigrisClient, searchRequest);
			return new SearchIterator<T>(initializer, this.config);
		} else {
			return new Promise<SearchResult<T>>((resolve, reject) => {
				const stream: grpc.ClientReadableStream<ProtoSearchResponse> =
					this.tigrisClient.search(searchRequest);

				stream.on("data", (searchResponse: ProtoSearchResponse) => {
					const searchResult: SearchResult<T> = toSearchResult(searchResponse, this.config);
					resolve(searchResult);
				});
				stream.on("error", (error) => reject(error));
				stream.on("end", () => resolve(SearchResult.empty));
			});
		}
	}

	search<T>(
		name: string,
		query: SearchQuery<T>,
		page?: number
	): SearchCursor<T> | Promise<SearchResult<T>> {
		const searchRequest = new ProtoSearchIndexRequest()
			.setProject(this.config.projectName)
			.setIndex(name);

		Utility.protoSearchRequestFromQuery(query, searchRequest, page);

		// return a iterator if no explicit page number is specified
		if (typeof page === "undefined") {
			const initializer = new SearchIndexIteratorInitializer(this.client, searchRequest);
			return new SearchIterator<T>(initializer, this.config);
		} else {
			return new Promise<SearchResult<T>>((resolve, reject) => {
				const stream: grpc.ClientReadableStream<ProtoSearchIndexResponse> =
					this.client.search(searchRequest);

				stream.on("data", (searchResponse: ProtoSearchIndexResponse) => {
					const searchResult: SearchResult<T> = toSearchResult(searchResponse, this.config);
					resolve(searchResult);
				});
				stream.on("error", (error) => reject(error));
				stream.on("end", () => resolve(SearchResult.empty));
			});
		}
	}
}

export function toSearchResult<T>(
	resp: ProtoSearchIndexResponse,
	config: TigrisClientConfig
): SearchResult<T> {
	const _meta =
		typeof resp?.getMeta() !== "undefined" ? toSearchMeta(resp.getMeta()) : SearchMeta.default;
	const _hits: Array<IndexedDoc<T>> = resp
		.getHitsList()
		.map((h: ProtoSearchHit) => toIndexedDoc<T>(h, config));
	const _facets: Facets = {};
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	for (const [k, _] of resp.getFacetsMap().toArray()) {
		_facets[k] = toFacetDistribution(resp.getFacetsMap().get(k));
	}
	const _groupedHits = resp.getGroupList().map((g: GroupedSearchHits) => {
		return {
			groupKeys: g.getGroupKeysList(),
			hits: g.getHitsList().map((h: ProtoSearchHit) => toIndexedDoc<T>(h, config)),
		};
	});

	return new SearchResult(_hits, _facets, _meta, _groupedHits);
}

export function toSearchMeta(resp: ProtoSearchMetadata): SearchMeta {
	const found = resp?.getFound() ?? 0;
	const totalPages = resp?.getTotalPages() ?? 0;
	const page = typeof resp?.getPage() !== "undefined" ? toPage(resp.getPage()) : undefined;
	return new SearchMeta(found, totalPages, page, resp.getMatchedFieldsList());
}

function toFacetDistribution(resp: ProtoSearchFacet): FacetCountDistribution {
	const stats = typeof resp?.getStats() !== "undefined" ? toFacetStats(resp.getStats()) : undefined;
	const counts = resp.getCountsList().map((c) => toFacetCount(c));
	return new FacetCountDistribution(counts, stats);
}

function toPage(resp: ProtoSearchPage): Page {
	const current = resp?.getCurrent() ?? 0;
	const size = resp?.getSize() ?? 0;
	return new Page(current, size);
}

function toFacetStats(resp: ProtoFacetStats): FacetStats {
	return new FacetStats(
		resp?.getAvg() ?? 0,
		resp?.getCount() ?? 0,
		resp?.getMax() ?? 0,
		resp?.getMin() ?? 0,
		resp?.getSum() ?? 0
	);
}

function toFacetCount(resp: ProtoFacetCount): FacetCount {
	return new FacetCount(resp.getValue(), resp.getCount());
}

export function toDocStatus(protoStatus: ProtoDocStatus[]): DocStatus[] {
	return protoStatus.map((protoStatus) => {
		const err = protoStatus.hasError()
			? new TigrisError(protoStatus.getError().getMessage())
			: undefined;
		return new DocStatus(protoStatus.getId(), err);
	});
}

export function toIndexedDoc<T extends TigrisCollectionType>(
	resp: ProtoSearchHit,
	config: TigrisClientConfig
): IndexedDoc<T> {
	const docAsB64 = resp.getData_asB64();
	if (!docAsB64) {
		return new IndexedDoc<T>(undefined, undefined);
	}
	const document = Utility.jsonStringToObj<T>(Utility._base64Decode(docAsB64), config);
	const meta = resp.hasMetadata() ? toDocMeta(resp.getMetadata()) : undefined;
	return new IndexedDoc<T>(document, meta);
}

export function toDocMeta(resp: ProtoSearchHitMeta): DocMeta {
	const _createdAt =
		typeof resp?.getCreatedAt()?.getSeconds() !== "undefined"
			? new Date(resp.getCreatedAt().getSeconds() * 1000)
			: undefined;
	const _updatedAt =
		typeof resp?.getUpdatedAt()?.getSeconds() !== "undefined"
			? new Date(resp.getUpdatedAt().getSeconds() * 1000)
			: undefined;
	const _textMatch =
		typeof resp?.getMatch() !== "undefined" ? toTextMatchInfo(resp.getMatch()) : undefined;

	return new DocMeta(_createdAt, _updatedAt, _textMatch);
}

export function toTextMatchInfo(resp: ProtoMatch): TextMatchInfo {
	const matchFields: Array<string> = resp.getFieldsList().map((f) => f.getName());
	return new TextMatchInfo(matchFields, resp.getScore(), resp.getVectorDistance());
}
