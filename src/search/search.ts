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
		schemaOrClass: TigrisIndexSchema<T> | (new () => TigrisIndexType)
	): Promise<SearchIndex<T>>;

	public createOrUpdateIndex<T extends TigrisIndexType>(
		nameOrClass: string | TigrisIndexType,
		schemaOrClass?: TigrisIndexSchema<T> | TigrisIndexType
	): Promise<SearchIndex<T>> {
		let indexName: string;
		let mayBeClass: new () => TigrisIndexType;
		let schema: TigrisIndexSchema<T>;

		if (typeof nameOrClass === "string") {
			indexName = nameOrClass as string;
			if (typeof schemaOrClass === "function") {
				mayBeClass = schemaOrClass as new () => TigrisIndexType;
			} else {
				schema = schemaOrClass as TigrisIndexSchema<T>;
			}
		} else {
			// only single class argument is passed
			mayBeClass = nameOrClass as new () => TigrisIndexType;
		}

		if (mayBeClass && !schema) {
			const generatedIndex = this.schemaProcessor.processIndex(mayBeClass);
			if (!generatedIndex) {
				return new Promise<SearchIndex<T>>((resolve, reject) => {
					reject(
						new Error(
							`An attempt was made to retrieve an index with the name ${indexName} but there is no index defined with that name.` +
								+"Please make sure an index has been defined using the 'TigrisSearchIndex' decorator."
						)
					);
				});
			}
			schema = generatedIndex.schema as TigrisIndexSchema<T>;
			// if indexName is not provided, use the one from model class
			indexName = indexName ?? generatedIndex.name;
		}

		const rawJSONSchema: string = Utility._indexSchematoJSON(indexName, schema);
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
