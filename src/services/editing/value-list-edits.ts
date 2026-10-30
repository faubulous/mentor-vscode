import { TextEditSpec } from '@src/utilities/text-edits';
import { FocusRequest } from './edit-plan';

/**
 * The text edits that write an edit of the values of a predicate, with where the first new value
 * was written.
 */
export interface ValueListEdits {
	/**
	 * The edits.
	 */
	edits: TextEditSpec[];

	/**
	 * Where the first new value is written, which takes the focus.
	 */
	focus?: FocusRequest;
}
