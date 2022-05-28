
import { Metadata } from "@grpc/grpc-js";
import json_bigint from "json-bigint";
import { TransactionCtx as ProtoTransactionCtx } from "./proto/server/v1/api_pb";
import { Session } from "./session";
import { Filter, Filters, LogicalFilter, LogicalFilters, ReadFields, UpdateFields } from "./types";

export const Utility = {
	stringToUint8Array(input: string): Uint8Array {
		return new TextEncoder().encode(input);
	},
	uint8ArrayToString(input: Uint8Array): string {
		return new TextDecoder().decode(input);
	},
	encodeBase64(input: string): string {
		return Buffer.from(input).toString("base64");
	},

	decodeBase64(b64String: string): string {
		return Buffer.from(b64String).toString("binary");
	},

	filterString<T>(filter: Filter | LogicalFilter): string {
		// eslint-disable-next-line no-prototype-builtins
		return filter.hasOwnProperty("logicalOperator")
			? Utility._logicalFilterString(filter as LogicalFilter)
			: this.objToJsonString(this.filterJSON(filter as Filter));
	},

	filterJSON(filter: Filter): Filters {
		return {  [filter.key]: filter.val  };
	},

	_logicalFilterString(filter: LogicalFilter): string {
		return this.objToJsonString(this.logicalFilterJSON(filter));
	},

	logicalFilterJSON(filter: LogicalFilter): LogicalFilters {
		const { filters, logicalFilters, logicalOperator } = filter;

		const filtersArray = filters?.map(Utility.filterJSON) ?? [];
		const logicalFiltersArray = logicalFilters?.map(Utility.logicalFilterJSON) ?? [];

		return {
			[logicalOperator]: [...filtersArray, ...logicalFiltersArray],
		};
	},

	readFieldString(readFields: ReadFields): string {
		const include = readFields.include?.reduce((acc, field) => ({ ...acc, [field]: true }), {});
		const exclude = readFields.exclude?.reduce((acc, field) => ({ ...acc, [field]: false }), {});

		return this.objToJsonString({ ...include, ...exclude });
	},

	updateFieldsString(updateFields: UpdateFields) {
		const { operator, fields } = updateFields;

		return this.objToJsonString({
			[operator]: fields,
		});
	},

	objToJsonString(obj: unknown): string {
		const JSONbigNative = json_bigint({ useNativeBigInt: true });
		return JSONbigNative.stringify(obj);
	},

	jsonStringToObj<T>(json: string): T {
		const JSONbigNative = json_bigint({ useNativeBigInt: true });
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
};
