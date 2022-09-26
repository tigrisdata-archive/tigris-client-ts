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
