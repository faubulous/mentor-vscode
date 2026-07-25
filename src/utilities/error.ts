/**
 * Represents an error when a feature or function is not supported by design.
 */
export class NotSupportedError extends Error {
	constructor() {
		super('This feature is not supported.');
	}
}

/**
 * Returns a human-readable message for a caught value: the `message` of an
 * `Error`, the string form of anything else. Use this instead of the inline
 * `e instanceof Error ? e.message : String(e)` idiom.
 */
export function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}