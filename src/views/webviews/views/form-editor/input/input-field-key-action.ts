/**
 * What a key asks a statement row to do. Keys that are not listed fall through to the field.
 */
export type InputFieldKeyAction =
	/**
	 * Move to the field before, with the caret at its end.
	 */
	| { kind: 'previousField' }
	/**
	 * Move to the field after, with the caret at its start.
	 */
	| { kind: 'nextField' }
	/**
	 * Confirm what was typed as a value and continue in the field for the next one.
	 */
	| { kind: 'commitField' }
	/**
	 * Remove the value of the field, as Backspace on a pill or in an emptied field does. The caret
	 * goes to the value before, or with `forward`, as Delete does, to the value after.
	 */
	| { kind: 'removeField'; forward?: boolean }
	/**
	 * Open the field for a new value of the statement, on a row of its own below the values.
	 */
	| { kind: 'addValue' }
	/**
	 * Remove the value before the field, as Backspace at the start of the new value does.
	 */
	| { kind: 'removePrevious' }
	/**
	 * Start the language tag (`@`) or the datatype (`^^`) of a literal, in a field after its text.
	 */
	| { kind: 'startSuffix'; marker: '@' | '^^' }
	/**
	 * Remove the language tag or datatype of a literal, as Backspace in its emptied field does.
	 */
	| { kind: 'removeSuffix' }
	/**
	 * Move to the start of the row, as Home at the start of a field does.
	 */
	| { kind: 'rowStart' }
	/**
	 * Move to the end of the row, as End at the end of a field does.
	 */
	| { kind: 'rowEnd' }
	/**
	 * Turn the field for a new value into a literal.
	 */
	| { kind: 'startLiteral' }
	/**
	 * Edit the resource of a pill as text, starting with the typed character when there is one.
	 */
	| { kind: 'editPill'; seed?: string }
	/**
	 * Leave the row for the one below, as Enter at the end of the row does.
	 */
	| { kind: 'nextRow' }
	/**
	 * Move to the row above.
	 */
	| { kind: 'rowUp' }
	/**
	 * Move to the row below.
	 */
	| { kind: 'rowDown' }
	/**
	 * Delete the statement of the row.
	 */
	| { kind: 'deleteRow' }
	/**
	 * Give up what was typed and leave the row as it was.
	 */
	| { kind: 'restore' };
