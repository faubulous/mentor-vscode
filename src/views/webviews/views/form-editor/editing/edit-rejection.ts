import { EditRejectionReason } from '../form-editor-edit-operation';

/**
 * Why an edit was not applied, in a form the webview can show.
 */
export interface EditRejection {
	reason: EditRejectionReason;
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
	 */
	toRejection(): EditRejection {
		return { reason: this.reason, message: this.message };
	}
}

/**
 * Indicate whether a synthesis result is a rejection rather than a plan.
 * @param value The result to inspect.
 */
export function isEditRejection(value: unknown): value is EditRejection {
	return typeof value === 'object' && value !== null && 'reason' in value && 'message' in value && !('edits' in value);
}
