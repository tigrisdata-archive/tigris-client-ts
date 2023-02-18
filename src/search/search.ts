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
import { DecoratedSchemaProcessor } from "../schema/decorated-schema-processor";

export class Search {
	private readonly client: SearchClient;
	private readonly config: TigrisClientConfig;
	private readonly schemaProcessor: DecoratedSchemaProcessor;

	constructor(client: SearchClient, config: TigrisClientConfig) {
		this.client = client;
		this.config = config;
		this.schemaProcessor = DecoratedSchemaProcessor.Instance;
	}

	public createOrUpdateIndex<T extends TigrisIndexType>(
		cls: new () => TigrisIndexType
	): Promise<SearchIndex<T>>;

	public createOrUpdateIndex<T extends TigrisIndexType>(
		name: string,
		schema: TigrisIndexSchema<T>
	): Promise<SearchIndex<T>>;

	public createOrUpdateIndex<T extends TigrisIndexType>(
		nameOrClass: string | TigrisIndexType,
		schema?: TigrisIndexSchema<T>
	): Promise<SearchIndex<T>> {
		let indexName: string;
		if (typeof nameOrClass === "string") {
			indexName = nameOrClass as string;
		} else {
			const generatedIndex = this.schemaProcessor.processIndex(
				nameOrClass as new () => TigrisIndexType
			);
			indexName = generatedIndex.name;
			schema = generatedIndex.schema as TigrisIndexSchema<T>;
		}

		const rawJSONSchema: string = Utility._schematoJSON(indexName, schema);
		const createOrUpdateIndexRequest = new ProtoCreateIndexRequest()
			.setProject(this.projectName)
			.setName(indexName)
			.setSchema(Utility.stringToUint8Array(rawJSONSchema));
		return new Promise<SearchIndex<T>>((resolve, reject) => {
			this.client.createOrUpdateIndex(createOrUpdateIndexRequest, (error, response) => {
				if (error) {
					reject(error);
					return;
				}
				console.log(`Created index: ${response.getMessage()}`);
				resolve(new SearchIndex(this.client, indexName, this.config));
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
