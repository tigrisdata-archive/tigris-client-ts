import {Metadata} from "@grpc/grpc-js";
import json_bigint from "json-bigint";
import {TransactionCtx as ProtoTransactionCtx} from "./proto/server/v1/api_pb";
import {Session} from "./session";
import {
	SelectorFilterOperator,
	SelectorFilter,
	LogicalFilter,
	ReadFields, TigrisCollectionType,
	UpdateFields
} from "./types";

export const Utility = {
	stringToUint8Array(input: string): Uint8Array {
		return new TextEncoder().encode(input);
	},
	uint8ArrayToString(input: Uint8Array): string {
		return new TextDecoder().decode(input);
	},
	filterToString<T>(filter: SelectorFilter<T> | LogicalFilter<T>): string {
		// eslint-disable-next-line no-prototype-builtins
		return filter.hasOwnProperty("logicalOperator")
			? Utility._logicalFilterToString(filter as LogicalFilter<T>)
			: this.objToJsonString(this._selectorFilterToJSONObj(filter as SelectorFilter<T>));
	},
	_selectorFilterToString<T extends TigrisCollectionType>(filter: SelectorFilter<T>): string {
		if (filter.op == SelectorFilterOperator.EQ) {
			return Utility.objToJsonString(Utility._flattenObj(Utility._selectorFilterToJSONObj(filter)))
		}
		return "";
	},
	_selectorFilterToJSONObj<T>(filter: SelectorFilter<T>): object {
		if (filter.op == SelectorFilterOperator.EQ) {
			return filter.fields
		}
		// add support later
		return {}
	},
	_logicalFilterToString<T>(filter: LogicalFilter<T>): string {
		return this.objToJsonString(Utility._logicalFilterToJSONObj(filter))
	},
	_logicalFilterToJSONObj<T>(filter: LogicalFilter<T>): object {
		const result = {};
		const innerFilters = [];
		result[filter.op] = innerFilters;
		if (filter.selectorFilters) {
			for (const value of filter.selectorFilters) {
				innerFilters.push(Utility._flattenObj(Utility._selectorFilterToJSONObj(value)))
			}
		}
		if(filter.logicalFilters){
			for (const value of filter.logicalFilters) innerFilters.push(Utility._logicalFilterToJSONObj(value))
		}
		return result;
	},
	readFieldString(readFields: ReadFields): string {
		const include = readFields.include?.reduce((acc, field) => ({...acc, [field]: true}), {});
		const exclude = readFields.exclude?.reduce((acc, field) => ({...acc, [field]: false}), {});

		return this.objToJsonString({...include, ...exclude});
	},

	updateFieldsString(updateFields: UpdateFields) {
		const {operator, fields} = updateFields;

		return this.objToJsonString({
			[operator]: fields,
		});
	},

	objToJsonString(obj: unknown): string {
		const JSONbigNative = json_bigint({useNativeBigInt: true});
		return JSONbigNative.stringify(obj);
	},

	jsonStringToObj<T>(json: string): T {
		const JSONbigNative = json_bigint({useNativeBigInt: true});
		return JSONbigNative.parse(json);
	},

	txApiToProto(tx: Session): ProtoTransactionCtx {
		return new ProtoTransactionCtx().setId(tx.id).setOrigin(tx.origin);
	},
	txToMetadata(tx: Session): Metadata {
		const metadata = new Metadata();
		if (tx) {
			metadata.set("tx-id", tx.id);
			metadata.set("tx-origin", tx.origin);
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

			if ((typeof ob[key]) == 'object' && ob[key] !== null) {
				const flatObject = Utility._flattenObj(ob[key]);
				for (const x in flatObject) {
					// eslint-disable-next-line no-prototype-builtins
					if (!flatObject.hasOwnProperty(x)) continue;

					toReturn[key + '.' + x] = flatObject[x];
				}
			} else {
				toReturn[key] = ob[key];
			}
		}
		return toReturn;
	}

};
