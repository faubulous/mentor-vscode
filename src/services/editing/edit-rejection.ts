import { EditProblem } from './edit-problem';

/**
 * Why an edit was not applied, in a form the webview can show.
 */
export interface EditRejection {
	/**
	 * What went wrong.
	 */
	problem: EditProblem;
}

/**
 * Thrown by the edit synthesis when an operation cannot be carried out. The synthesizer turns it
 * into an {@link EditRejection}; anything else that is thrown is a programming error.
 */
export class EditRejectionError extends Error {
	/**
	 * Create the error.
	 * @param problem What went wrong.
	 */
	constructor(readonly problem: EditProblem) {
		super(`The edit was rejected: ${problem.kind}`);

		this.name = 'EditRejectionError';
	}

	/**
	 * Convert the error into the plain rejection sent to the webview.
	 * @returns The problem of the rejection.
	 */
	toRejection(): EditRejection {
		return { problem: this.problem };
	}
}

/**
 * Indicate whether a synthesis result is a rejection rather than a plan.
 * @param value The result to inspect.
 * @returns `true` for a rejection.
 */
export function isEditRejection(value: unknown): value is EditRejection {
	return typeof value === 'object' && value !== null && 'problem' in value && !('edits' in value);
}
