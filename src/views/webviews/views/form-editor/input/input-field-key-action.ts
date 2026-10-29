/**
 * What a key asks a statement row to do. Keys that are not listed fall through to the field.
 */
export type InputFieldKeyAction =
	/**
	 * Move to the field before, with the caret at its end; with `stops`, to the stop before, as
	 * Shift+Tab does, passing the pills.
	 */
	| { kind: 'previousField'; stops?: boolean }
	/**
	 * Move to the field after, with the caret at its start; with `stops`, to the stop after, as
	 * Tab does, passing the pills.
	 */
	| { kind: 'nextField'; stops?: boolean }
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
	 * Continue in the input of the row with the character typed on a pill.
	 */
	| { kind: 'typeIntoInput'; seed: string }
	/**
	 * Write the row now and stay in it, as Enter in a literal does.
	 */
	| { kind: 'saveRow' }
	/**
	 * Open the picker of the language tag or datatype of a literal, as Enter on its button does.
	 */
	| { kind: 'pickTag' }
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
