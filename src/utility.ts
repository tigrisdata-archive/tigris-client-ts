import { Metadata } from "@grpc/grpc-js";
import json_bigint from "json-bigint";
import { Session } from "./session";

import {
	DeleteQueryOptions,
	Filter,
	FindQueryOptions,
	LogicalFilter,
	LogicalOperator,
	SortOrder,
	ReadFields,
	Selector,
	SelectorFilter,
	SelectorFilterOperator,
	TigrisCollectionType,
	TigrisDataTypes,
	TigrisSchema,
	UpdateFields,
	UpdateQueryOptions,
	GroupByField,
} from "./types";
import * as fs from "node:fs";
import {
	Collation as ProtoCollation,
	DeleteRequestOptions as ProtoDeleteRequestOptions,
	ReadRequestOptions as ProtoReadRequestOptions,
	SearchRequest as ProtoSearchRequest,
	UpdateRequestOptions as ProtoUpdateRequestOptions,
} from "./proto/server/v1/api_pb";
import { TigrisClientConfig } from "./tigris";
import {
	FacetFieldsQuery,
	FacetQueryOptions,
	MATCH_ALL_QUERY_STRING,
	SearchQuery,
	VectorQuery,
} from "./search";
import { TigrisIndexSchema } from "./search";
import { SearchIndexRequest as ProtoSearchIndexRequest } from "./proto/server/v1/search_pb";

export const Utility = {
	stringToUint8Array(input: string): Uint8Array {
		return new TextEncoder().encode(input);
	},

	uint8ArrayToString(input: Uint8Array): string {
		return new TextDecoder().decode(input);
	},

	/** @see tests for usage */
	branchNameFromEnv(given?: string): string | undefined {
		const maybeBranchName = typeof given !== "undefined" ? given : process.env.TIGRIS_DB_BRANCH;
		if (typeof maybeBranchName === "undefined") {
			return undefined;
		}
		const isTemplate = Utility.getTemplatedVar(maybeBranchName);
		if (isTemplate) {
			return isTemplate.extracted in process.env
				? maybeBranchName.replace(
						isTemplate.matched,
						this.nerfGitBranchName(process.env[isTemplate.extracted])
				  )
				: undefined;
		} else {
			return this.nerfGitBranchName(maybeBranchName);
		}
	},

	/** @see {@link branchNameFromEnv} tests for usage */
	getTemplatedVar(input: string): { matched: string; extracted: string } {
		const output = input.match(/\${(.*?)}/);
		return output ? { matched: output[0], extracted: output[1] } : undefined;
	},

	/** @see tests for usage */
	nerfGitBranchName(original: string) {
		// only replace '/', '#', ' ' to avoid malformed urls
		return original.replace(/[ #/]/g, "_");
	},

	filterToString<T>(filter: Filter<T>): string {
		if (
			Object.prototype.hasOwnProperty.call(filter, "op") &&
			(filter["op"] === LogicalOperator.AND || filter["op"] === LogicalOperator.OR)
		) {
			// LogicalFilter
			return Utility._logicalFilterToString(filter as LogicalFilter<T>);
			// eslint-disable-next-line no-prototype-builtins
		} else if (filter.hasOwnProperty("op")) {
			// SelectorFilter
			return Utility._selectorFilterToString(filter as SelectorFilter<T>);
		} else {
			// Selector (default operator $eq)
			return Utility.objToJsonString(filter);
		}
	},
	_getRandomInt(upperBound: number): number {
		return Math.floor(Math.random() * upperBound);
	},
	_selectorFilterToString<T extends TigrisCollectionType>(filter: SelectorFilter<T>): string {
		switch (filter.op) {
			case SelectorFilterOperator.NONE:
				// filter nothing
				return "{}";
			case SelectorFilterOperator.EQ:
			case SelectorFilterOperator.LT:
			case SelectorFilterOperator.LTE:
			case SelectorFilterOperator.GT:
			case SelectorFilterOperator.GTE:
				return Utility.objToJsonString(
					Utility._selectorFilterToFlatJSONObj(filter.op, filter.fields)
				);
			default:
				return "";
		}
	},

	_selectorFilterToFlatJSONObj(op: SelectorFilterOperator, fields: object): object {
		switch (op) {
			case SelectorFilterOperator.NONE:
				return {};
			case SelectorFilterOperator.EQ:
				return Utility._flattenObj(fields);
			case SelectorFilterOperator.LT:
			case SelectorFilterOperator.LTE:
			case SelectorFilterOperator.GT:
			case SelectorFilterOperator.GTE: {
				const flattenedFields = Utility._flattenObj(fields);
				for (const key in flattenedFields) {
					flattenedFields[key] = { [op]: flattenedFields[key] };
				}
				return flattenedFields;
			}
			default:
				return Utility._flattenObj(fields);
		}
	},

	_logicalFilterToString<T>(filter: LogicalFilter<T>): string {
		return this.objToJsonString(Utility._logicalFilterToJSONObj(filter));
	},

	_logicalFilterToJSONObj<T>(filter: LogicalFilter<T>): object {
		const result = {};
		const innerFilters = [];
		result[filter.op] = innerFilters;
		if (filter.selectorFilters) {
			for (const value of filter.selectorFilters) {
				// eslint-disable-next-line no-prototype-builtins
				if (value.hasOwnProperty("op")) {
					const v = value as SelectorFilter<T>;
					innerFilters.push(Utility._selectorFilterToFlatJSONObj(v.op, v.fields));
				} else {
					const v = value as Selector<T>;
					innerFilters.push(Utility._selectorFilterToFlatJSONObj(SelectorFilterOperator.EQ, v));
				}
			}
		}
		if (filter.logicalFilters) {
			for (const value of filter.logicalFilters)
				innerFilters.push(Utility._logicalFilterToJSONObj(value));
		}
		return result;
	},

	readFieldString(readFields: ReadFields): string {
		const include = readFields.include?.reduce((acc, field) => ({ ...acc, [field]: true }), {});
		const exclude = readFields.exclude?.reduce((acc, field) => ({ ...acc, [field]: false }), {});

		return this.objToJsonString({ ...include, ...exclude });
	},

	updateFieldsString<T>(updateFields: UpdateFields<T>) {
		// UpdateFields
		const updateBuilder: object = {};
		for (const [key, value] of Object.entries(updateFields)) {
			switch (key) {
				case "$set":
				case "$unset":
				case "$divide":
				case "$increment":
				case "$decrement":
				case "$multiply":
					updateBuilder[key] = value;
					break;
				default:
					// by default everything else is a "$set" update
					if (!("$set" in updateBuilder)) {
						updateBuilder["$set"] = {};
					}
					updateBuilder["$set"][key] = value;
			}
		}
		return this.objToJsonString(updateBuilder);
	},

	// eslint-disable-next-line @typescript-eslint/ban-types
	objToJsonString(obj: object): string {
		const JSONbigNative = json_bigint({ useNativeBigInt: true });
		return JSONbigNative.stringify(obj);
	},
	/**
	 * Tigris uses custom deserialization to support `bigint`. By default the `bigint` from JSON
	 * string will be converted back to model object as a `string` field. If user wants to
	 * convert it back to `bigint`, the client config has to have `supportBigInt` set to `true`.
	 *
	 * Javascript's native way of ser/de (JSON.stringify(), JSON.parse()) doesn't support bigint
	 * yet. If the model object used in other parts of the application that depends on native
	 * JSON serde mechanism - you might want to continue using it as `string`.
	 *
	 *
	 * @param json - string representation of JSON object
	 * @param config - Tigris client config instance
	 */
	jsonStringToObj<T>(json: string, config: TigrisClientConfig): T {
		const JSONbigNative = json_bigint({ useNativeBigInt: true });
		return JSONbigNative.parse(json, (k, v) => {
			// convert bigint to string based on configuration
			if (typeof v === "bigint" && (config.supportBigInt === undefined || !config.supportBigInt)) {
				return v.toString();
			} else if (typeof v === "string" && this._isISODateRegex(v)) {
				return new Date(v);
			}

			return v;
		});
	},
	_isISODateRegex(value: string) {
		const isoDateRegex =
			/(\d{4}-[01]\d-[0-3]\dT[0-2](?:\d:[0-5]){2}\d\.\d+([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2](?:\d:[0-5]){2}\d([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))/;
		return isoDateRegex.test(value);
	},
	txToMetadata(tx: Session): Metadata {
		const metadata = new Metadata();
		if (tx !== undefined && tx !== null) {
			metadata.set("Tigris-Tx-Id", tx.id);
			metadata.set("Tigris-Tx-Origin", tx.origin);
			metadata.merge(tx.additionalMetadata);
		}
		return metadata;
	},

	/*
	This method converts nested json object to single level object.
	 for example
	 {
		 "name": "Alice",
		 "balance" : 123.123,
		 "address": {
			"city": "San Francisco",
			"state": "California"
		 }
	 }
	 gets converted to
	 {
		 "name": "Alice",
		 "balance" : 123.123,
		 "address.city": "San Francisco",
		 "address.state": "California"
	 }

	 This is used for filter JSON serialization internally.
	*/
	_flattenObj(ob: object): object {
		const toReturn = {};
		for (const key in ob) {
			// eslint-disable-next-line no-prototype-builtins
			if (!ob.hasOwnProperty(key)) continue;

			if (typeof ob[key] == "object" && ob[key] !== null) {
				const value = ob[key];
				if (value.constructor.name === "Date") {
					toReturn[key] = (value as Date).toJSON();
				} else {
					const flatObject = Utility._flattenObj(value);
					for (const x in flatObject) {
						// eslint-disable-next-line no-prototype-builtins
						if (!flatObject.hasOwnProperty(x)) continue;
						toReturn[key + "." + x] = flatObject[x];
					}
				}
			} else {
				toReturn[key] = ob[key];
			}
		}
		return toReturn;
	},

	_indexSchematoJSON<T>(indexName: string, schema: TigrisIndexSchema<T>): string {
		const root = { title: indexName, type: "object" };
		root["properties"] = this._getSchemaProperties(schema, {}, {});
		return Utility.objToJsonString(root);
	},

	_collectionSchematoJSON<T>(collectionName: string, schema: TigrisSchema<T>): string {
		const root = {};
		const pkeyMap = {};
		const keyMap = {};
		root["title"] = collectionName;
		root["additionalProperties"] = false;
		root["type"] = "object";
		root["properties"] = this._getSchemaProperties(schema, pkeyMap, keyMap);
		Utility._postProcessDocumentSchema(root, pkeyMap);
		return Utility.objToJsonString(root);
	},
	/*
	TODO:
	  - validate the user defined schema (for example look for primary keys with duplicate
	  order)
	 - this can be extended for other schema massaging
	 */
	_postProcessDocumentSchema(result: object, pkeyMap: object): object {
		if (Object.keys(pkeyMap).length === 0) {
			return result;
		}
		result["primary_key"] = [];
		// add primary_key in order
		for (let i = 1; i <= Object.keys(pkeyMap).length; i++) {
			result["primary_key"].push(pkeyMap[i.toString()]);
		}
		return result;
	},

	_getSchemaProperties<T>(
		schema: TigrisSchema<T> | TigrisIndexSchema<T>,
		pkeyMap: object,
		keyMap: object
	): object {
		const properties = {};

		for (const property of Object.keys(schema)) {
			let thisProperty = {};
			// single flat property? OR the property referring to another type (nested collection)
			if (
				typeof schema[property].type === "object" ||
				!(schema[property]["items"] || schema[property]["type"])
			) {
				thisProperty["type"] = "object";
				thisProperty["properties"] = this._getSchemaProperties(
					schema[property]["type"],
					pkeyMap,
					keyMap
				);
			} else if (schema[property].type === TigrisDataTypes.OBJECT) {
				thisProperty["type"] = "object";
				thisProperty["properties"] = {};
			} else if (
				schema[property].type != TigrisDataTypes.ARRAY.valueOf() &&
				typeof schema[property].type != "object"
			) {
				thisProperty["type"] = this._getType(schema[property].type);
				const format = this._getFormat(schema[property].type);
				if (format) {
					thisProperty["format"] = format;
				}

				// flat property could be a primary key
				if (schema[property].primary_key) {
					pkeyMap[schema[property].primary_key["order"]] = property;
					//  autogenerate?
					if (schema[property].primary_key["autoGenerate"]) {
						thisProperty["autoGenerate"] = true;
					}
				}

				// TODO: Add default_sort_by field

				// flat property could be a partition key
				if (schema[property].key) {
					keyMap[schema[property].key["order"]] = property;
				}

				// property is string and has "maxLength" optional attribute
				if (
					thisProperty["type"] == TigrisDataTypes.STRING.valueOf() &&
					thisProperty["format"] === undefined &&
					schema[property].maxLength
				) {
					thisProperty["maxLength"] = schema[property].maxLength as number;
				}

				// array type?
			} else if (schema[property].type === TigrisDataTypes.ARRAY.valueOf()) {
				thisProperty = this._getArrayBlock(schema[property], pkeyMap, keyMap);
			}

			properties[property] = thisProperty;

			// 'default' values for schema fields, if any
			if ("default" in schema[property]) {
				switch (schema[property].default) {
					case undefined:
						// eslint-disable-next-line unicorn/no-null
						thisProperty["default"] = null;
						break;
					default:
						thisProperty["default"] = schema[property].default;
				}
			}

			// whether secondary index is enabled for this field
			if ("index" in schema[property]) {
				thisProperty["index"] = schema[property]["index"];
			}

			// indexing optionals
			if ("searchIndex" in schema[property]) {
				thisProperty["searchIndex"] = schema[property]["searchIndex"];
			}
			if ("sort" in schema[property]) {
				thisProperty["sort"] = schema[property]["sort"];
			}
			if ("facet" in schema[property]) {
				thisProperty["facet"] = schema[property]["facet"];
			}
			if ("id" in schema[property]) {
				thisProperty["id"] = schema[property]["id"];
			}

			// 'timestamp' values for schema fields
			if ("timestamp" in schema[property]) {
				thisProperty[schema[property].timestamp] = true;
			}
		}
		return properties;
	},
	_readRequestOptionsToProtoReadRequestOptions(input: FindQueryOptions): ProtoReadRequestOptions {
		const result: ProtoReadRequestOptions = new ProtoReadRequestOptions();
		if (input !== undefined) {
			if (input.skip !== undefined) {
				result.setSkip(input.skip);
			}

			if (input.limit !== undefined) {
				result.setLimit(input.limit);
			}

			if (input.collation !== undefined) {
				result.setCollation(new ProtoCollation().setCase(input.collation.case));
			}

			if (input.offset !== undefined) {
				result.setOffset(Utility.stringToUint8Array(input.offset));
			}
		}
		return result;
	},
	_deleteRequestOptionsToProtoDeleteRequestOptions(
		input: DeleteQueryOptions
	): ProtoDeleteRequestOptions {
		const result: ProtoDeleteRequestOptions = new ProtoDeleteRequestOptions();
		if (input !== undefined) {
			if (input.collation !== undefined) {
				result.setCollation(new ProtoCollation().setCase(input.collation.case));
			}
			if (input.limit !== undefined) {
				result.setLimit(input.limit);
			}
		}
		return result;
	},
	_updateRequestOptionsToProtoUpdateRequestOptions(
		input: UpdateQueryOptions
	): ProtoUpdateRequestOptions {
		const result: ProtoUpdateRequestOptions = new ProtoUpdateRequestOptions();
		if (input !== undefined) {
			if (input.collation !== undefined) {
				result.setCollation(new ProtoCollation().setCase(input.collation.case));
			}
			if (input.limit !== undefined) {
				result.setLimit(input.limit);
			}
		}
		return result;
	},
	_getArrayBlock(
		arraySchema: TigrisSchema<unknown> | TigrisDataTypes,
		pkeyMap: object,
		keyMap: object
	): object {
		const arrayBlock = {};
		arrayBlock["type"] = "array";
		if (typeof arraySchema === "object" && "dimensions" in arraySchema) {
			arrayBlock["dimensions"] = arraySchema["dimensions"];
			arrayBlock["format"] = "vector";
		} else {
			arrayBlock["items"] = {};
			arrayBlock["items"] = this._getSchemaProperties(
				{ _$arrayItemPlaceholder: arraySchema["items"] },
				pkeyMap,
				keyMap
			)["_$arrayItemPlaceholder"];
		}
		return arrayBlock;
	},

	_getType(fieldType: TigrisDataTypes): string {
		switch (fieldType.valueOf()) {
			case TigrisDataTypes.BOOLEAN:
				return "boolean";
			case TigrisDataTypes.INT32:
			case TigrisDataTypes.INT64:
			case TigrisDataTypes.NUMBER_BIGINT:
				return "integer";
			case TigrisDataTypes.NUMBER:
				return "number";
			case TigrisDataTypes.STRING:
			case TigrisDataTypes.UUID:
			case TigrisDataTypes.DATE_TIME:
			case TigrisDataTypes.BYTE_STRING:
				return "string";
			case TigrisDataTypes.OBJECT:
				return "object";
		}
		return undefined;
	},

	_getFormat(fieldType: TigrisDataTypes): string {
		switch (fieldType.valueOf()) {
			case TigrisDataTypes.INT32:
				return "int32";
			case TigrisDataTypes.INT64:
				return "int64";
			case TigrisDataTypes.UUID:
				return "uuid";
			case TigrisDataTypes.DATE_TIME:
				return "date-time";
			case TigrisDataTypes.BYTE_STRING:
				return "byte";
		}
		return undefined;
	},

	_readTestDataFile(path: string): string {
		return Utility.objToJsonString(
			Utility.jsonStringToObj(fs.readFileSync("src/__tests__/data/" + path, "utf8"), {
				serverUrl: "test",
			})
		);
	},

	_base64Encode(input: string): string {
		return Buffer.from(input, "utf8").toString("base64");
	},

	_base64Decode(b64String: string): string {
		return Buffer.from(b64String, "base64").toString("utf8");
	},

	_base64DecodeToObject(b64String: string, config: TigrisClientConfig): object {
		return this.jsonStringToObj(Buffer.from(b64String, "base64").toString("utf8"), config);
	},

	defaultFacetingOptions(options?: Partial<FacetQueryOptions>): FacetQueryOptions {
		const defaults: FacetQueryOptions = { size: 10, type: "value" };
		return { ...defaults, ...options };
	},

	facetQueryToString(facets: FacetFieldsQuery): string {
		const optionsMap = {};
		if (Array.isArray(facets)) {
			for (const f of facets) {
				optionsMap[f] = this.defaultFacetingOptions();
			}
		} else if (typeof facets === "object") {
			for (const f in facets) {
				optionsMap[f] = this.defaultFacetingOptions(facets[f]);
			}
		}
		return this.objToJsonString(optionsMap);
	},

	_vectorQueryToString(q: VectorQuery): string {
		if (typeof q === "undefined") {
			return "";
		}
		return this.objToJsonString(q);
	},

	_sortOrderingToString(ordering: SortOrder): string {
		if (typeof ordering === "undefined") {
			return "[]";
		}

		const sortOrders = [];
		if (!Array.isArray(ordering)) {
			ordering = [ordering];
		}
		for (const o of ordering) {
			sortOrders.push({ [o.field]: o.order });
		}
		return this.objToJsonString(sortOrders);
	},

	_groupByToString(fields: string[]): string {
		const groupBy: GroupByField = {
			fields: [],
		};

		if (typeof fields === "undefined") {
			return this.objToJsonString(groupBy);
		}

		groupBy.fields = [...fields];

		return this.objToJsonString(groupBy);
	},

	protoSearchRequestFromQuery<T>(
		query: SearchQuery<T>,
		searchRequest: ProtoSearchRequest | ProtoSearchIndexRequest,
		page?: number
	) {
		searchRequest.setQ(query.q ?? MATCH_ALL_QUERY_STRING);

		if (query.searchFields !== undefined) {
			searchRequest.setSearchFieldsList(query.searchFields);
		}

		if (query.filter !== undefined) {
			searchRequest.setFilter(Utility.stringToUint8Array(Utility.filterToString(query.filter)));
		}

		if (query.facets !== undefined) {
			searchRequest.setFacet(Utility.stringToUint8Array(Utility.facetQueryToString(query.facets)));
		}

		if (query.vectorQuery !== undefined) {
			searchRequest.setVector(
				Utility.stringToUint8Array(Utility._vectorQueryToString(query.vectorQuery))
			);
		}

		if (query.sort !== undefined) {
			searchRequest.setSort(Utility.stringToUint8Array(Utility._sortOrderingToString(query.sort)));
		}

		if (query.groupBy !== undefined) {
			searchRequest.setGroupBy(Utility.stringToUint8Array(Utility._groupByToString(query.groupBy)));
		}

		if (query.includeFields !== undefined) {
			searchRequest.setIncludeFieldsList(query.includeFields);
		}

		if (query.excludeFields !== undefined) {
			searchRequest.setExcludeFieldsList(query.excludeFields);
		}

		if (query.hitsPerPage !== undefined) {
			searchRequest.setPageSize(query.hitsPerPage);
		}

		if (query.options?.collation !== undefined) {
			searchRequest.setCollation(new ProtoCollation().setCase(query.options.collation.case));
		}

		if (page !== undefined) {
			searchRequest.setPage(page);
		}
	},
};
