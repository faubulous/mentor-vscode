import { EditRejectionReason } from './edit-operation';

/**
 * Why an edit was not applied, in a form the webview can show.
 */
export interface EditRejection {
	/**
	 * Why the edit was not applied.
	 */
	reason: EditRejectionReason;

	/**
	 * The explanation shown to the user.
	 */
	message: string;
}

/**
 * Thrown by the edit synthesis when an operation cannot be carried out. The synthesizer turns it
 * into an {@link EditRejection}; anything else that is thrown is a programming error.
 */
export class EditRejectionError extends Error {
	constructor(readonly reason: EditRejectionReason, message: string) {
		super(message);

		this.name = 'EditRejectionError';
	}

	/**
	 * Convert the error into the plain rejection sent to the webview.
	 * @returns The reason and message of the rejection.
	 */
	toRejection(): EditRejection {
		return { reason: this.reason, message: this.message };
	}
}

/**
 * Indicate whether a synthesis result is a rejection rather than a plan.
 * @param value The result to inspect.
 * @returns `true` for a rejection.
 */
export function isEditRejection(value: unknown): value is EditRejection {
	return typeof value === 'object' && value !== null && 'reason' in value && 'message' in value && !('edits' in value);
}
