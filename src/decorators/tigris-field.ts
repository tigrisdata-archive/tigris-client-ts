import "reflect-metadata";
import { TigrisDataTypes, TigrisFieldOptions } from "../types";
import { EmbeddedFieldOptions } from "./options/embedded-field-options";
import {
	CannotInferFieldTypeError,
	IncompleteArrayTypeDefError,
	ReflectionNotEnabled,
} from "../error";
import { getDecoratorMetaStorage } from "../globals";
import { FieldMetadata } from "./metadata/field-metadata";
import { Log } from "../utils/logger";

/**
 * Field decorator is used to mark a class property as Collection field. Only properties
 * decorated with `@Field` will be used in Schema.
 *
 * Uses `Reflection` to determine the data type of schema Field.
 */
export function Field(): PropertyDecorator;
/**
 * Field decorator is used to mark a class property as Collection field. Only properties
 * decorated with `@Field` will be used in Schema.
 *
 * @param type - Schema field's data type
 */
export function Field(type: TigrisDataTypes): PropertyDecorator;
/**
 * Field decorator is used to mark a class property as Collection field. Only properties
 * decorated with `@Field` will be used in Schema.
 *
 * Uses `Reflection` to determine the data type of schema Field.
 *
 * @param options - `EmbeddedFieldOptions` are only applicable to Array and Object types
 * 									of schema field.
 */
export function Field(options: EmbeddedFieldOptions & TigrisFieldOptions): PropertyDecorator;
/**
 * Field decorator is used to mark a class property as Collection field. Only properties
 * decorated with `@Field` will be used in Schema.
 *
 * Uses `Reflection` to determine the data type of schema Field.
 *
 * @param type - Schema field's data type
 * @param options - `EmbeddedFieldOptions` are only applicable to Array and Object types
 * 									of schema field.
 */
export function Field(
	type: TigrisDataTypes,
	options?: EmbeddedFieldOptions & TigrisFieldOptions
): PropertyDecorator;

/**
 * Field decorator is used to mark a class property as Collection field. Only properties
 * decorated with `@Field` will be used in Schema.
 */
export function Field(
	typeOrOptions?: TigrisDataTypes | (TigrisFieldOptions & EmbeddedFieldOptions),
	options?: TigrisFieldOptions & EmbeddedFieldOptions
): PropertyDecorator {
	return function (target, propertyName) {
		propertyName = propertyName.toString();
		let propertyType: TigrisDataTypes | undefined;
		let fieldOptions: TigrisFieldOptions;
		let embedOptions: EmbeddedFieldOptions;

		if (typeof typeOrOptions === "string") {
			propertyType = <TigrisDataTypes>typeOrOptions;
		} else if (typeof typeOrOptions === "object") {
			if (isEmbeddedOption(typeOrOptions)) {
				embedOptions = typeOrOptions as EmbeddedFieldOptions;
			}
			fieldOptions = typeOrOptions as TigrisFieldOptions;
		}

		if (typeof options === "object") {
			if (isEmbeddedOption(options)) {
				embedOptions = options as EmbeddedFieldOptions;
			}
			fieldOptions = options as TigrisFieldOptions;
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

		getDecoratorMetaStorage().fields.push({
			name: propertyName,
			type: propertyType,
			isArray: propertyType === TigrisDataTypes.ARRAY,
			target: target.constructor,
			embedType: embedOptions?.elements,
			arrayDepth: embedOptions?.depth,
			schemaFieldOptions: fieldOptions,
		} as FieldMetadata);
	};
}

function getTigrisTypeFromReflectedType(reflectedType: string): TigrisDataTypes | undefined {
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

function isEmbeddedOption(
	options: TigrisFieldOptions | EmbeddedFieldOptions
): options is EmbeddedFieldOptions {
	return (options as EmbeddedFieldOptions).elements !== undefined;
}
