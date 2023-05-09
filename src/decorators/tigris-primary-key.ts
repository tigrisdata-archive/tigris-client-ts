import "reflect-metadata";
import { PrimaryKeyOptions, TigrisDataTypes } from "../types";
import { CannotInferFieldTypeError, ReflectionNotEnabled } from "../error";
import { getDecoratorMetaStorage } from "../globals";
import { PrimaryKeyMetadata } from "./metadata/primary-key-metadata";
import { Log } from "../utils/logger";

/**
 * PrimaryKey decorator is used to mark a class property as Primary Key in a collection.
 *
 * Uses `Reflection` to determine the data type of schema Field
 *
 * @param options - Additional properties
 */
export function PrimaryKey(options?: PrimaryKeyOptions): PropertyDecorator;
/**
 * PrimaryKey decorator is used to mark a class property as Primary Key in a collection.
 *
 * Uses `Reflection` to determine the type of schema Field
 *
 * @param type - Schema field's data type
 * @param options - Additional properties
 */
export function PrimaryKey(type: TigrisDataTypes, options?: PrimaryKeyOptions): PropertyDecorator;

/**
 * PrimaryKey decorator is used to mark a class property as Primary Key in a collection.
 */
export function PrimaryKey(
	typeOrOptions: TigrisDataTypes | PrimaryKeyOptions,
	options?: PrimaryKeyOptions
): PropertyDecorator {
	return function (target, propertyName) {
		propertyName = propertyName.toString();
		let propertyType: TigrisDataTypes;

		if (typeof typeOrOptions === "string") {
			propertyType = typeOrOptions as TigrisDataTypes;
		} else if (typeof typeOrOptions === "object") {
			options = typeOrOptions as PrimaryKeyOptions;
		}

		// infer type from reflection
		if (!propertyType) {
			Log.info(`Using reflection to infer type of ${target.constructor.name}#${propertyName}`);
			try {
				const reflectedType =
					Reflect && Reflect.getMetadata
						? Reflect.getMetadata("design:type", target, propertyName)
						: undefined;
				propertyType = ReflectedTypeToTigrisType.get(reflectedType.name);
			} catch {
				throw new ReflectionNotEnabled(target, propertyName);
			}
		}
		if (!propertyType) {
			throw new CannotInferFieldTypeError(target, propertyName);
		}

		getDecoratorMetaStorage().primaryKeys.push({
			name: propertyName,
			type: propertyType,
			target: target.constructor,
			options: options,
		} as PrimaryKeyMetadata);
	};
}

const ReflectedTypeToTigrisType: Map<string, TigrisDataTypes> = new Map([
	["String", TigrisDataTypes.STRING],
	["Number", TigrisDataTypes.NUMBER],
	["BigInt", TigrisDataTypes.NUMBER_BIGINT],
]);
