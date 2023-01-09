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
export class CursorInUseError extends TigrisError {
	constructor(message = "Cursor is already in use or used. Please reset()") {
		super(message);
	}

	override get name(): string {
		return "CursorInUseError";
	}
}

export class ReflectionNotEnabled extends TigrisError {
	constructor(object: Object, propertyName: string) {
		super(
			`Cannot infer property "type" for ${object.constructor.name}#${propertyName} using Reflection.
			Ensure that "experimentalDecorators" and "emitDecoratorMetadata" options are set to true in
			"tsconfig.json" and "reflect-metadata" npm package is added to dependencies in "package.json".
			Alternatively, specify the property's "field type" manually.`
		);
	}

	override get name(): string {
		return "ReflectionNotEnabled";
	}
}

export class MissingArgumentError extends TigrisError {
	constructor(propertyName: string) {
		super(`'${propertyName}' is required and cannot be 'undefined'`);
	}

	override get name(): string {
		return "MissingArgumentError";
	}
}

export class CannotInferFieldTypeError extends TigrisError {
	constructor(object: Object, propertyName: string) {
		super(`Field type for '${object.constructor.name}#${propertyName}' cannot be determined`);
	}

	override get name(): string {
		return "CannotInferFieldTypeError";
	}
}

export class IncompleteArrayTypeDefError extends TigrisError {
	constructor(object: Object, propertyName: string) {
		super(
			`Missing "EmbeddedFieldOptions". Array's item type for '${object.constructor.name}#${propertyName}' cannot be determined`
		);
	}
	override get name(): string {
		return "IncompleteArrayTypeDefError";
	}
}

export class IncompletePrimaryKeyDefError extends TigrisError {
	constructor(object: Object, propertyName: string) {
		super(`Missing "PrimaryKeyOptions" for '${object.constructor.name}#${propertyName}'`);
	}

	override get name(): string {
		return "IncompletePrimaryKeyDefError";
	}
}

export class CollectionNotFoundError extends TigrisError {
	constructor(name: string) {
		super(`Collection not found : '${name}'`);
	}

	override get name(): string {
		return "CollectionNotFoundError";
	}
}
