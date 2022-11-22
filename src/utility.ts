import { Metadata } from "@grpc/grpc-js";
import json_bigint from "json-bigint";
import { Session } from "./session";

import {
	DeleteRequestOptions,
	LogicalFilter,
	LogicalOperator,
	ReadFields,
	ReadRequestOptions,
	Selector,
	SelectorFilter,
	SelectorFilterOperator,
	SimpleUpdateField,
	TigrisCollectionType,
	TigrisDataTypes,
	TigrisSchema,
	UpdateFields,
	UpdateFieldsOperator,
	UpdateRequestOptions,
} from "./types";
import * as fs from "node:fs";
import {
	Case,
	FacetFieldsQuery,
	FacetQueryFieldType,
	FacetQueryOptions,
	MATCH_ALL_QUERY_STRING,
	Ordering,
	SearchRequest,
	SearchRequestOptions,
} from "./search/types";
import {
	Collation as ProtoCollation,
	DeleteRequestOptions as ProtoDeleteRequestOptions,
	ReadRequestOptions as ProtoReadRequestOptions,
	SearchRequest as ProtoSearchRequest,
	UpdateRequestOptions as ProtoUpdateRequestOptions,
} from "./proto/server/v1/api_pb";
import { TigrisClientConfig } from "./tigris";

export const Utility = {
	stringToUint8Array(input: string): Uint8Array {
		return new TextEncoder().encode(input);
	},

	uint8ArrayToString(input: Uint8Array): string {
		return new TextDecoder().decode(input);
	},

	filterToString<T>(filter: SelectorFilter<T> | LogicalFilter<T> | Selector<T>): string {
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

	updateFieldsString(updateFields: UpdateFields | SimpleUpdateField) {
		// UpdateFields
		// eslint-disable-next-line no-prototype-builtins
		if (updateFields.hasOwnProperty("op")) {
			const { op, fields } = updateFields as UpdateFields;

			return this.objToJsonString({
				[op]: fields,
			});
		} else {
			// SimpleUpdateField
			return Utility.updateFieldsString({
				op: UpdateFieldsOperator.SET,
				fields: updateFields as SimpleUpdateField,
			});
		}
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
	 * @param json string representation of JSON object
	 * @param config Tigris client config instance
	 */
	jsonStringToObj<T>(json: string, config: TigrisClientConfig): T {
		const JSONbigNative = json_bigint({ useNativeBigInt: true });
		return JSONbigNative.parse(json, (k, v) => {
			// convert bigint to string based on configuration
			if (typeof v === "bigint" && (config.supportBigInt === undefined || !config.supportBigInt)) {
				return v.toString();
			}
			return v;
		});
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
				const flatObject = Utility._flattenObj(ob[key]);
				for (const x in flatObject) {
					// eslint-disable-next-line no-prototype-builtins
					if (!flatObject.hasOwnProperty(x)) continue;

					toReturn[key + "." + x] = flatObject[x];
				}
			} else {
				toReturn[key] = ob[key];
			}
		}
		return toReturn;
	},

	_toJSONSchema<T>(collectionName: string, schema: TigrisSchema<T>): string {
		const root = {};
		const pkeyMap = {};
		const keyMap = {};
		root["title"] = collectionName;
		root["additionalProperties"] = false;
		root["type"] = "object";
		root["properties"] = this._getSchemaProperties(schema, pkeyMap, keyMap);
		root["collection_type"] = "documents";
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
			// if no pkeys was used defined. add implicit pkey
			result["properties"]["id"] = {
				type: "string",
				format: "uuid",
			};
			result["primary_key"] = ["id"];
		} else {
			result["primary_key"] = [];
			// add primary_key in order
			for (let i = 1; i <= Object.keys(pkeyMap).length; i++) {
				result["primary_key"].push(pkeyMap[i.toString()]);
			}
		}
		return result;
	},

	_postProcessMessageSchema(result: object, keyMap: object): object {
		const len = Object.keys(keyMap).length;
		if (len > 0) {
			result["key"] = [];
			// add key in order
			for (let i = 1; i <= len; i++) {
				result["key"].push(keyMap[i.toString()]);
			}
		}
		return result;
	},

	_getSchemaProperties<T>(schema: TigrisSchema<T>, pkeyMap: object, keyMap: object): object {
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

				// flat property could be a partition key
				if (schema[property].key) {
					keyMap[schema[property].key["order"]] = property;
				}

				// array type?
			} else if (schema[property].type === TigrisDataTypes.ARRAY.valueOf()) {
				thisProperty = this._getArrayBlock(schema[property], pkeyMap, keyMap);
			}
			properties[property] = thisProperty;
		}
		return properties;
	},
	_readRequestOptionsToProtoReadRequestOptions(input: ReadRequestOptions): ProtoReadRequestOptions {
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
		input: DeleteRequestOptions
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
		input: UpdateRequestOptions
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
		arrayBlock["items"] = {};
		// array of array?
		if (arraySchema["items"]["type"] === TigrisDataTypes.ARRAY.valueOf()) {
			arrayBlock["items"] = this._getArrayBlock(arraySchema["items"], pkeyMap, keyMap);
			// array of custom type?
		} else if (typeof arraySchema["items"]["type"] === "object") {
			arrayBlock["items"]["type"] = "object";
			arrayBlock["items"]["properties"] = this._getSchemaProperties(
				arraySchema["items"]["type"],
				pkeyMap,
				keyMap
			);
			// within array: single flat property?
		} else {
			arrayBlock["items"]["type"] = this._getType(arraySchema["items"]["type"] as TigrisDataTypes);
			const format = this._getFormat(arraySchema["items"]["type"] as TigrisDataTypes);
			if (format) {
				arrayBlock["items"]["format"] = format;
			}
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
		return Buffer.from(input, "binary").toString("base64");
	},

	_base64Decode(b64String: string): string {
		return Buffer.from(b64String, "base64").toString("binary");
	},

	createFacetQueryOptions(options?: Partial<FacetQueryOptions>): FacetQueryOptions {
		const defaults = { size: 10, type: FacetQueryFieldType.VALUE };
		return { ...defaults, ...options };
	},

	createSearchRequestOptions(options?: Partial<SearchRequestOptions>): SearchRequestOptions {
		const defaults = { page: 1, perPage: 20, collation: { case: Case.CaseInsensitive } };
		return { ...defaults, ...options };
	},

	facetQueryToString(facets: FacetFieldsQuery): string {
		if (Array.isArray(facets)) {
			const optionsMap = {};
			for (const f of facets) {
				optionsMap[f] = this.createFacetQueryOptions();
			}
			return this.objToJsonString(optionsMap);
		} else {
			return this.objToJsonString(facets);
		}
	},

	sortOrderingToString(ordering: Ordering): string {
		if (ordering === undefined || ordering.length === 0) {
			return "[]";
		}

		const sortOrders = [];
		for (const o of ordering) {
			sortOrders.push({ [o.field]: o.order });
		}
		return this.objToJsonString(sortOrders);
	},

	createProtoSearchRequest<T>(
		dbName: string,
		collectionName: string,
		request: SearchRequest<T>,
		options?: SearchRequestOptions
	): ProtoSearchRequest {
		const searchRequest = new ProtoSearchRequest()
			.setDb(dbName)
			.setCollection(collectionName)
			.setQ(request.q ?? MATCH_ALL_QUERY_STRING);

		if (request.searchFields !== undefined) {
			searchRequest.setSearchFieldsList(request.searchFields);
		}

		if (request.filter !== undefined) {
			searchRequest.setFilter(Utility.stringToUint8Array(Utility.filterToString(request.filter)));
		}

		if (request.facets !== undefined) {
			searchRequest.setFacet(
				Utility.stringToUint8Array(Utility.facetQueryToString(request.facets))
			);
		}

		if (request.sort !== undefined) {
			searchRequest.setSort(Utility.stringToUint8Array(Utility.sortOrderingToString(request.sort)));
		}

		if (request.includeFields !== undefined) {
			searchRequest.setIncludeFieldsList(request.includeFields);
		}

		if (request.excludeFields !== undefined) {
			searchRequest.setExcludeFieldsList(request.excludeFields);
		}

		if (options !== undefined) {
			if (options.page !== undefined) {
				searchRequest.setPage(options.page);
			}
			if (options.perPage !== undefined) {
				searchRequest.setPageSize(options.perPage);
			}
			if (options.collation !== undefined) {
				searchRequest.setCollation(new ProtoCollation().setCase(options.collation.case));
			}
		}

		return searchRequest;
	},
};
