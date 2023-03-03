import "reflect-metadata";
import { TigrisDataTypes } from "../types";
import { EmbeddedFieldOptions } from "./options/embedded-field-options";
import { SearchFieldOptions } from "../search";
import { getTigrisTypeFromReflectedType, isEmbeddedOption } from "./utils";
import { Log } from "../utils/logger";
import {
	CannotInferFieldTypeError,
	IncompleteArrayTypeDefError,
	ReflectionNotEnabled,
} from "../error";
import { getDecoratorMetaStorage } from "../globals";
import { SearchFieldMetadata } from "./metadata/search-field-metadata";

export function SearchField(): PropertyDecorator;
export function SearchField(type: TigrisDataTypes): PropertyDecorator;
export function SearchField(options: EmbeddedFieldOptions & SearchFieldOptions): PropertyDecorator;
export function SearchField(
	type: TigrisDataTypes,
	options: EmbeddedFieldOptions & SearchFieldOptions
): PropertyDecorator;

export function SearchField(
	typeOrOptions?: TigrisDataTypes | (SearchFieldOptions & EmbeddedFieldOptions),
	options?: SearchFieldOptions & EmbeddedFieldOptions
): PropertyDecorator {
	return function (target, propertyName) {
		propertyName = propertyName.toString();
		let propertyType: TigrisDataTypes | undefined;
		let fieldOptions: SearchFieldOptions;
		let embedOptions: EmbeddedFieldOptions;

		if (typeof typeOrOptions === "string") {
			propertyType = <TigrisDataTypes>typeOrOptions;
		} else if (typeof typeOrOptions === "object") {
			if (isEmbeddedOption(typeOrOptions)) {
				embedOptions = typeOrOptions as EmbeddedFieldOptions;
			}
			fieldOptions = typeOrOptions as SearchFieldOptions;
		}

		if (typeof options === "object") {
			if (isEmbeddedOption(options)) {
				embedOptions = options as EmbeddedFieldOptions;
			}
			fieldOptions = options as SearchFieldOptions;
		}

		// if type or options are not specified, infer using reflection
		if (!propertyType) {
			Log.info(`Using reflection to infer type of ${target.constructor.name}#${propertyName}`);
			let reflectedType;
			try {
				reflectedType =
					Reflect && Reflect.getMetadata
						? Reflect.getMetadata("design:type", target, propertyName)
						: undefined;
				propertyType = getTigrisTypeFromReflectedType(reflectedType.name);
			} catch {
				throw new ReflectionNotEnabled(target, propertyName);
			}

			// if propertyType is Array, subtype is required
			if (propertyType === TigrisDataTypes.ARRAY && embedOptions?.elements === undefined) {
				throw new IncompleteArrayTypeDefError(target, propertyName);
			}

			// if propertyType is still undefined, it probably is a typed object
			if (propertyType === undefined) {
				propertyType = TigrisDataTypes.OBJECT;
				embedOptions = { elements: reflectedType };
			}
		}

		if (!propertyType) {
			throw new CannotInferFieldTypeError(target, propertyName);
		}

		// if propertyType is Array, subtype is required
		if (propertyType === TigrisDataTypes.ARRAY && embedOptions?.elements === undefined) {
			throw new IncompleteArrayTypeDefError(target, propertyName);
		}
		const defaultFieldOption = { index: true };
		fieldOptions = { ...defaultFieldOption, ...fieldOptions };

		getDecoratorMetaStorage().searchFields.push({
			name: propertyName,
			type: propertyType,
			isArray: propertyType === TigrisDataTypes.ARRAY,
			target: target.constructor,
			embedType: embedOptions?.elements,
			arrayDepth: embedOptions?.depth,
			schemaFieldOptions: fieldOptions,
		} as SearchFieldMetadata);
	};
}
