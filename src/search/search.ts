import { SearchClient } from "../proto/server/v1/search_grpc_pb";
import { TigrisClientConfig } from "../tigris";
import { DeleteIndexResponse, IndexInfo, TigrisIndexSchema, TigrisIndexType } from "./types";
import { SearchIndex } from "./search-index";
import { Utility } from "../utility";
import {
	CreateOrUpdateIndexRequest as ProtoCreateIndexRequest,
	DeleteIndexRequest as ProtoDeleteIndexRequest,
	GetIndexRequest as ProtoGetIndexRequest,
	ListIndexesRequest as ProtoListIndexesRequest,
} from "../proto/server/v1/search_pb";

export class Search {
	private readonly client: SearchClient;
	private readonly config: TigrisClientConfig;

	constructor(client: SearchClient, config: TigrisClientConfig) {
		this.client = client;
		this.config = config;
	}

	public createOrUpdateIndex<T extends TigrisIndexType>(
		name: string,
		schema: TigrisIndexSchema<T>
	): Promise<SearchIndex<T>> {
		const rawJSONSchema: string = Utility._schematoJSON(name, schema);
		// TODO: Add only create boolean
		const createOrUpdateIndexRequest = new ProtoCreateIndexRequest()
			.setProject(this.projectName)
			.setName(name)
			.setSchema(Utility.stringToUint8Array(rawJSONSchema));
		return new Promise<SearchIndex<T>>((resolve, reject) => {
			this.client.createOrUpdateIndex(createOrUpdateIndexRequest, (error, response) => {
				if (error) {
					reject(error);
					return;
				}
				console.log(`Created index: ${response.getMessage()}`);
				resolve(new SearchIndex(this.client, name, this.config));
			});
		});
	}

	public listIndexes(): Promise<Array<IndexInfo>> {
		// TODO: Set filter on request
		const listIndexRequest = new ProtoListIndexesRequest().setProject(this.projectName);
		return new Promise<Array<IndexInfo>>((resolve, reject) => {
			this.client.listIndexes(listIndexRequest, (error, response) => {
				if (error) {
					reject(error);
					return;
				}
				resolve(response.getIndexesList().map((i) => IndexInfo.from(i)));
			});
		});
	}

	public getIndex<T extends TigrisIndexType>(name: string): Promise<SearchIndex<T>> {
		const getIndexRequest = new ProtoGetIndexRequest().setProject(this.projectName).setName(name);
		return new Promise<SearchIndex<T>>((resolve, reject) => {
			this.client.getIndex(getIndexRequest, (error, response) => {
				if (error) {
					reject(error);
					return;
				}
				if (response.hasIndex()) {
					resolve(new SearchIndex(this.client, name, this.config));
				}
			});
		});
	}

	public deleteIndex(name: string): Promise<DeleteIndexResponse> {
		const deleteIndexRequest = new ProtoDeleteIndexRequest()
			.setProject(this.projectName)
			.setName(name);

		return new Promise<DeleteIndexResponse>((resolve, reject) => {
			this.client.deleteIndex(deleteIndexRequest, (error, response) => {
				if (error) {
					reject(error);
					return;
				}
				resolve(DeleteIndexResponse.from(response));
			});
		});
	}

	public get projectName(): string {
		return this.config.projectName;
	}
}
