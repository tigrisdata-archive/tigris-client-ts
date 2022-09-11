import {Metadata} from "@grpc/grpc-js";
import json_bigint from "json-bigint";
import {Session} from "./session";
import {
	CollectionType,
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
	UpdateFieldsOperator
} from "./types";
import * as fs from "node:fs";
import {FacetFieldsQuery, FacetQueryFieldType, FacetQueryOptions, Ordering} from "./search/types";
import {ReadRequestOptions as ProtoReadRequestOptions} from "./proto/server/v1/api_pb";

export const Utility = {
	stringToUint8Array(input: string): Uint8Array {
		return new TextEncoder().encode(input);
	},

	uint8ArrayToString(input: Uint8Array): string {
		return new TextDecoder().decode(input);
	},

	filterToString<T>(filter: SelectorFilter<T> | LogicalFilter<T> | Selector<T>): string {
		// eslint-disable-next-line no-prototype-builtins
		if (filter.hasOwnProperty("op") && (filter["op"] === LogicalOperator.AND || filter["op"] === LogicalOperator.OR)) {
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
				return Utility.objToJsonString(Utility._selectorFilterToFlatJSONObj(filter.op, filter.fields));
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
					flattenedFields[key] = {[op]: flattenedFields[key]};
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
			for (const value of filter.logicalFilters) innerFilters.push(Utility._logicalFilterToJSONObj(value));
		}
		return result;
	},

	readFieldString(readFields: ReadFields): string {
		const include = readFields.include?.reduce((acc, field) => ({...acc, [field]: true}), {});
		const exclude = readFields.exclude?.reduce((acc, field) => ({...acc, [field]: false}), {});

		return this.objToJsonString({...include, ...exclude});
	},

	updateFieldsString(updateFields: UpdateFields | SimpleUpdateField) {
		// UpdateFields
		// eslint-disable-next-line no-prototype-builtins
		if (updateFields.hasOwnProperty("op")) {
			const {op, fields} = (updateFields as UpdateFields);

			return this.objToJsonString({
				[op]: fields,
			});
		} else {
			// SimpleUpdateField
			return Utility.updateFieldsString({
				op: UpdateFieldsOperator.SET,
				fields: (updateFields as SimpleUpdateField)
			});
		}
	},

	objToJsonString(obj: unknown): string {
		const JSONbigNative = json_bigint({useNativeBigInt: true});
		return JSONbigNative.stringify(obj);
	},

	jsonStringToObj<T>(json: string): T {
		const JSONbigNative = json_bigint({useNativeBigInt: true});
		return JSONbigNative.parse(json);
	},
	txToMetadata(tx: Session): Metadata {
		const metadata = new Metadata();
		if (tx !== undefined) {
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

			if ((typeof ob[key]) == "object" && ob[key] !== null) {
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

	_toJSONSchema<T>(collectionName: string, collectionType: CollectionType, schema: TigrisSchema<T>): string {
		const root = {};
		const pkeyMap = {};
		root["title"] = collectionName;
		root["additionalProperties"] = false;
		root["type"] = "object";
		root["properties"] = this._getSchemaProperties(schema, pkeyMap);
		root["collection_type"] = collectionType;
		if (collectionType !== "messages") {
			Utility._postProcessSchema(root, pkeyMap);
		}
		return Utility.objToJsonString(root);
	},
	/*
	TODO:
	  - validate the user defined schema (for example look for primary keys with duplicate
	  order)
	 - this can be extended for other schema massaging
	 */
	_postProcessSchema(result: object, pkeyMap: object): object {
		if (Object.keys(pkeyMap).length === 0) {
			// if no pkeys was used defined. add implicit pkey
			result["properties"]["id"] = {
				"type": "string",
				"format": "uuid"
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

	_getSchemaProperties<T>(schema: TigrisSchema<T>, pkeyMap: object): object {
		const properties = {};

		for (const property of Object.keys(schema)) {
			let thisProperty = {};
			// single flat property? OR the property referring to another type (nested collection)
			if (typeof schema[property].type === "object" || (!(schema[property]["items"] || schema[property]["type"]))) {
				thisProperty["type"] = "object";
				thisProperty["properties"] = this._getSchemaProperties(schema[property]["type"], pkeyMap);
			} else if (schema[property].type != TigrisDataTypes.ARRAY.valueOf()
				&& typeof schema[property].type != "object") {
				thisProperty["type"] = this._getType(schema[property].type);
				const format = this._getFormat(schema[property].type);
				if (format) {
					thisProperty["format"] = format;
				}

				// flat property could be a pkey
				if (schema[property].primary_key) {
					pkeyMap[schema[property].primary_key["order"]] = property;
					//  autogenerate?
					if (schema[property].primary_key["autoGenerate"]) {
						thisProperty["autoGenerate"] = true;
					}
				}
				// array type?
			} else if (schema[property].type === TigrisDataTypes.ARRAY.valueOf()) {
				thisProperty = this._getArrayBlock(schema[property], pkeyMap);
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
				result.setSkip(input.limit);
			}

			if (input.offset !== undefined) {
				result.setOffset(Utility.stringToUint8Array(input.offset));
			}
		}
		return result;
	},
	_getArrayBlock(arraySchema: TigrisSchema<unknown> | TigrisDataTypes, pkeyMap: object): object {
		const arrayBlock = {};
		arrayBlock["type"] = "array";
		arrayBlock["items"] = {};
		// array of array?
		if (arraySchema["items"]["type"] === TigrisDataTypes.ARRAY.valueOf()) {
			arrayBlock["items"] = this._getArrayBlock(arraySchema["items"], pkeyMap);
			// array of custom type?
		} else if (typeof arraySchema["items"]["type"] === "object") {
			arrayBlock["items"]["type"] = "object";
			arrayBlock["items"]["properties"] = this._getSchemaProperties(arraySchema["items"]["type"], pkeyMap);
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
		return Utility.objToJsonString(Utility.jsonStringToObj(fs.readFileSync("src/__tests__/data/" + path, "utf8")));
	},

	_base64Encode(input: string): string {
		return Buffer.from(input, "binary").toString("base64");
	},

	_base64Decode(b64String: string): string {
		return Buffer.from(b64String, "base64").toString("binary");
	},

	createFacetQueryOptions(options?: Partial<FacetQueryOptions>): FacetQueryOptions {
		const defaults = {size: 10, type: FacetQueryFieldType.VALUE};
		return {...defaults, ...options};
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
			sortOrders.push({[o.field]: o.order});
		}
		return this.objToJsonString(sortOrders);
	},
};
