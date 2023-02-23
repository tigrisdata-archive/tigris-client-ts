import "reflect-metadata";
import { TigrisDataTypes } from "../types";
import { EmbeddedFieldOptions } from "./options/embedded-field-options";
import { TigrisIndexFieldOptions } from "../search";
import { getTigrisTypeFromReflectedType, isEmbeddedOption } from "./utils";
import { Log } from "../utils/logger";
import {
	CannotInferFieldTypeError,
	IncompleteArrayTypeDefError,
	ReflectionNotEnabled,
} from "../error";
import { getDecoratorMetaStorage } from "../globals";
import { IndexFieldMetadata } from "./metadata/index-field-metadata";

export function IndexField(): PropertyDecorator;
export function IndexField(type: TigrisDataTypes): PropertyDecorator;
export function IndexField(
	options: EmbeddedFieldOptions & TigrisIndexFieldOptions
): PropertyDecorator;
export function IndexField(
	type: TigrisDataTypes,
	options: EmbeddedFieldOptions & TigrisIndexFieldOptions
): PropertyDecorator;

export function IndexField(
	typeOrOptions?: TigrisDataTypes | (TigrisIndexFieldOptions & EmbeddedFieldOptions),
	options?: TigrisIndexFieldOptions & EmbeddedFieldOptions
): PropertyDecorator {
	return function (target, propertyName) {
		propertyName = propertyName.toString();
		let propertyType: TigrisDataTypes | undefined;
		let fieldOptions: TigrisIndexFieldOptions;
		let embedOptions: EmbeddedFieldOptions;

		if (typeof typeOrOptions === "string") {
			propertyType = <TigrisDataTypes>typeOrOptions;
		} else if (typeof typeOrOptions === "object") {
			if (isEmbeddedOption(typeOrOptions)) {
				embedOptions = typeOrOptions as EmbeddedFieldOptions;
			}
			fieldOptions = typeOrOptions as TigrisIndexFieldOptions;
		}

		if (typeof options === "object") {
			if (isEmbeddedOption(options)) {
				embedOptions = options as EmbeddedFieldOptions;
			}
			fieldOptions = options as TigrisIndexFieldOptions;
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
		getDecoratorMetaStorage().indexFields.push({
			name: propertyName,
			type: propertyType,
			isArray: propertyType === TigrisDataTypes.ARRAY,
			target: target.constructor,
			embedType: embedOptions?.elements,
			arrayDepth: embedOptions?.depth,
			schemaFieldOptions: fieldOptions,
		} as IndexFieldMetadata);
	};
}
