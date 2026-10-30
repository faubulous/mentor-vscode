import { InputFieldId } from './input-field-id';

/**
 * Where the caret goes in a field that takes the focus.
 */
export type InputFieldCaret = 'start' | 'end';

/**
 * A field of a row that is to take the focus, once it exists.
 */
export interface InputFieldFocusRequest {
	/**
	 * The field.
	 */
	field: InputFieldId;

	/**
	 * Where the caret goes.
	 */
	caret: InputFieldCaret;
}
