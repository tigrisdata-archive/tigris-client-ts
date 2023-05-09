import { TigrisDataTypes, CollectionFieldOptions } from "../types";
import { EmbeddedFieldOptions } from "./options/embedded-field-options";

export function getTigrisTypeFromReflectedType(reflectedType: string): TigrisDataTypes | undefined {
	switch (reflectedType) {
		case "String":
			return TigrisDataTypes.STRING;
		case "Boolean":
			return TigrisDataTypes.BOOLEAN;
		case "Object":
			return TigrisDataTypes.OBJECT;
		case "Array":
		case "Set":
			return TigrisDataTypes.ARRAY;
		case "Number":
			return TigrisDataTypes.NUMBER;
		case "BigInt":
			return TigrisDataTypes.NUMBER_BIGINT;
		case "Date":
			return TigrisDataTypes.DATE_TIME;
		default:
			return undefined;
	}
}

export function isEmbeddedOption(
	options: CollectionFieldOptions | EmbeddedFieldOptions
): options is EmbeddedFieldOptions {
	return (options as EmbeddedFieldOptions).elements !== undefined;
}
