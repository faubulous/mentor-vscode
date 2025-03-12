/**
 * Represents an error when a feature or function is not supported by design.
 */
export class NotSupportedError extends Error {
	constructor() {
		super('This feature is not supported.');
	}
}