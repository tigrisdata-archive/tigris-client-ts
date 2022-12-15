/**
 * Generic TigrisError
 */
export class TigrisError extends Error {
	constructor(message: string) {
		super(message);
	}

	override get name(): string {
		return "TigrisError";
	}
}

/**
 * An error thrown when the user attempts to consume a cursor that has already been
 * used
 *
 * @public
 * @category Error
 */
export class TigrisCursorInUseError extends TigrisError {
	constructor(message = "Cursor is already in use or used. Please reset()") {
		super(message);
	}

	override get name(): string {
		return "TigrisCursorInUseError";
	}
}

/**
 * An error thrown when path is invalid or not found
 *
 * @public
 * @category Error
 */
export class TigrisFileNotFoundError extends TigrisError {
	constructor(message) {
		super(message);
	}

	override get name(): string {
		return "TigrisFileNotFoundError";
	}
}

export class TigrisMoreThanOneSchemaDefined extends TigrisError {
	constructor(fileName, foundSchemas) {
		super(
			`${foundSchemas} TigrisSchema detected in file ${fileName}, should only have 1 TigrisSchema exported`
		);
	}
	override get name(): string {
		return "TigrisMoreThanOneSchemaDefined";
	}
}

export class ReflectionNotEnabled extends TigrisError {
	constructor(object: Object, propertyName: string) {
		super(
			`Cannot infer property 'type' for ${object.constructor.name}#${propertyName} using Reflection.
			Ensure that 'emitDecoratorMetadata' option is set to true in 'tsconfig.json'. Also, make sure
			to import 'reflect-metadata' on top of the main entry file in application`
		);
	}

	override get name(): string {
		return "ReflectionNotEnabled";
	}
}

export class CannotInferFieldTypeError extends TigrisError {
	constructor(object: Object, propertyName: string) {
		super(`Field type for ${object.constructor.name}#${propertyName} cannot be determined`);
	}

	override get name(): string {
		return "CannotInferFieldTypeError";
	}
}

export class IncompleteArrayTypeDefError extends TigrisError {
	constructor(object: Object, propertyName: string) {
		super(
			`Missing "EmbeddedFieldOptions". Array's item type for ${object.constructor.name}#${propertyName} cannot be determined`
		);
	}
	override get name(): string {
		return "IncompleteArrayTypeDefError";
	}
}

export class IncompletePrimaryKeyDefError extends TigrisError {
	constructor(object: Object, propertyName: string) {
		super(`Missing "PrimaryKeyOptions" for ${object.constructor.name}#${propertyName}`);
	}

	override get name(): string {
		return "IncompletePrimaryKeyDefError";
	}
}
