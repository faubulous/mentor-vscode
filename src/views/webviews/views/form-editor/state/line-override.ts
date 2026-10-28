import { ResourceDetail } from '../form-editor-model';

/**
 * The text a row shows instead of the text of its line, until the host delivers the statement
 * it was committed with. The override holds while the line still reads as it did when the text
 * was committed.
 */
export interface LineOverride {
	/**
	 * The text of the line when the override was made.
	 */
	original: string;

	/**
	 * The text to show.
	 */
	text: string;

	/**
	 * The resource the text was submitted against, when it was. The text stands in until the
	 * host delivers the resource again, whatever it then says: after an undo it says the original.
	 */
	submittedWith?: ResourceDetail;
}
