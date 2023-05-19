import { TigrisClientConfig } from "../tigris";
import { DeleteIndexResponse, IndexInfo, TigrisIndexSchema, TigrisIndexType } from "./types";
import { SearchIndex } from "./search-index";
import { Utility } from "../utility";
import { DecoratedSchemaProcessor } from "../schema/decorated-schema-processor";
import { SearchDriver } from "../driver/driver";
import { Log } from "../utils/logger";

export class Search {
	private readonly driver: SearchDriver;
	private readonly config: TigrisClientConfig;
	private readonly schemaProcessor: DecoratedSchemaProcessor;

	constructor(driver: SearchDriver, config: TigrisClientConfig) {
		this.driver = driver;
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

	public async createOrUpdateIndex<T extends TigrisIndexType>(
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
		const binSchema = Utility.stringToUint8Array(rawJSONSchema);
		const msg = await this.driver.createOrUpdateIndex(indexName, binSchema);
		Log.debug(`Created index: ${msg}`);
		return new SearchIndex(this.driver, indexName, this.config);
	}

	public listIndexes(): Promise<Array<IndexInfo>> {
		// TODO: Set filter on request
		return this.driver.listIndexes();
	}

	// TODO: this doesn't have to be promise but would be a breaking change for existing users
	public getIndex<T extends TigrisIndexType>(name: string): Promise<SearchIndex<T>> {
		return Promise.resolve(new SearchIndex(this.driver, name, this.config));
	}

	public async deleteIndex(name: string): Promise<DeleteIndexResponse> {
		const resp = await this.driver.deleteIndex(name);
		return new DeleteIndexResponse(resp);
	}

	public get projectName(): string {
		return this.config.projectName;
	}
}
