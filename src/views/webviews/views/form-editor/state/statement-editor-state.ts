import { InputFieldCaret, InputFieldFocusRequest } from '../input/input-field-focus-request';
import { InputFieldId } from '../input/input-field-id';
import { EditableStatement } from './editable-statement';
import { EditableValue } from './editable-value';

/**
 * The state of the fields of one statement row: the statement as edited, the text typed into
 * the field for a new value, and the field to focus next.
 * Immutable: every transition returns the next state, and the field that is to take the focus
 * travels with it, so the row moves the caret once the field is drawn.
 */
export class StatementEditorState {
	/**
	 * Create a state.
	 * @param statement The statement as edited.
	 * @param pending The text typed into the field for a new value.
	 * @param focusRequest The field to focus once it exists.
	 * @param focusedField The field that holds the caret, while the row is edited.
	 * @param pickingTag The index of the literal whose tag picker is open, if any.
	 */
	constructor(
		readonly statement: EditableStatement,
		readonly pending = '',
		readonly focusRequest?: InputFieldFocusRequest,
		readonly focusedField?: InputFieldId,
		readonly pickingTag?: number
	) { }

	/**
	 * The state of a row showing a statement, with nothing typed.
	 * @param statement The statement.
	 * @returns The state.
	 */
	static of(statement: EditableStatement): StatementEditorState {
		return new StatementEditorState(statement);
	}

	/**
	 * Whether the row holds nothing: no predicate, no values and nothing typed.
	 */
	get rowEmpty(): boolean {
		return this.statement.predicate.trim() === '' && this.statement.values.length === 0 && this.pending.trim() === '';
	}

	/**
	 * Replace the statement, as typing into its fields does.
	 * @param statement The statement.
	 * @returns The next state.
	 */
	withStatement(statement: EditableStatement): StatementEditorState {
		return new StatementEditorState(statement, this.pending, this.focusRequest, this.focusedField, this.pickingTag);
	}

	/**
	 * Replace the text typed into the field for a new value.
	 * @param pending The text.
	 * @returns The next state.
	 */
	withPending(pending: string): StatementEditorState {
		return new StatementEditorState(this.statement, pending, this.focusRequest, this.focusedField);
	}

	/**
	 * Ask for a field to take the focus.
	 * @param field The field.
	 * @param caret Where the caret goes.
	 * @returns The next state.
	 */
	focusing(field: InputFieldId, caret: InputFieldCaret): StatementEditorState {
		return new StatementEditorState(this.statement, this.pending, { field, caret }, this.focusedField);
	}

	/**
	 * Note that the requested focus was given.
	 * @returns The next state, the state itself when no focus was requested.
	 */
	focusFulfilled(): StatementEditorState {
		return this.focusRequest ? new StatementEditorState(this.statement, this.pending, undefined, this.focusedField, this.pickingTag) : this;
	}

	/**
	 * Open the picker of the language tag or datatype of a literal.
	 * @param index The index of the literal.
	 * @returns The next state.
	 */
	tagPickerOpened(index: number): StatementEditorState {
		return new StatementEditorState(this.statement, this.pending, this.focusRequest, this.focusedField, index);
	}

	/**
	 * Close the tag picker and bring the caret back to the button of the tag.
	 * @returns The next state, the state itself when no picker is open.
	 */
	tagPickerClosed(): StatementEditorState {
		return this.pickingTag === undefined ? this : new StatementEditorState(this.statement, this.pending, { field: InputFieldId.tag(this.pickingTag), caret: 'end' }, this.focusedField);
	}

	/**
	 * Give a literal the tag picked for it and close the picker.
	 * @param index The index of the literal.
	 * @param suffix The tag as written: `@language` or `^^datatype`, empty for none.
	 * @returns The next state.
	 */
	tagPicked(index: number, suffix: string): StatementEditorState {
		const value = this.statement.values[index];
		const statement = value?.kind === 'literal' ? this.statement.withValue(index, { kind: 'literal', value: value.value, suffix }) : this.statement;

		return new StatementEditorState(statement, this.pending, { field: InputFieldId.value(index), caret: 'end' }, this.focusedField);
	}

	/**
	 * Note that a field took the focus.
	 * @param field The field.
	 * @returns The next state, the state itself when the field had the focus already.
	 */
	fieldFocused(field: InputFieldId): StatementEditorState {
		return field.equals(this.focusedField) ? this : new StatementEditorState(this.statement, this.pending, this.focusRequest, field, this.pickingTag);
	}

	/**
	 * Note that the caret left the row: the text typed for a new value becomes a value.
	 * @param value The value read from the typed text, or `undefined` when nothing was typed.
	 * @returns The next state.
	 */
	left(value: EditableValue | undefined): StatementEditorState {
		return new StatementEditorState(this.pendingFolded(value).statement);
	}

	/**
	 * Take what was typed into the field for a new value as a value of the statement.
	 * @param value The value read from the typed text, or `undefined` when nothing was typed.
	 * @returns The next state, the state itself when nothing was typed.
	 */
	pendingFolded(value: EditableValue | undefined): StatementEditorState {
		return value ? new StatementEditorState(this.statement.withValueAppended(value), '', this.focusRequest, this.focusedField) : this;
	}

	/**
	 * Continue in the input of the row with the character typed on a pill.
	 * @param seed The typed character.
	 * @returns The next state.
	 */
	typedIntoInput(seed: string): StatementEditorState {
		return new StatementEditorState(this.statement, this.pending + seed, { field: InputFieldId.NEW_VALUE, caret: 'end' }, this.focusedField);
	}

	/**
	 * Take what was typed into the field for a new value as a value of the statement and continue
	 * in the emptied field, or in the literal the text became when the row has no field for a
	 * new value any more.
	 * @param value The value read from the typed text, or `undefined` when nothing was typed.
	 * @returns The next state.
	 */
	typedValueCommitted(value: EditableValue | undefined): StatementEditorState {
		const statement = this.pendingFolded(value).statement;

		return new StatementEditorState(statement, '', { field: statement.lastField(), caret: 'end' }, this.focusedField);
	}

	/**
	 * Remove a value and put the caret on the value that stands nearest: the one before it, or
	 * with `forward` the one that takes its place, or the field for a new value when none is left.
	 * @param index The index of the value.
	 * @param forward Whether the caret goes to the value after, as Delete does.
	 * @returns The next state.
	 */
	valueRemoved(index: number, forward: boolean): StatementEditorState {
		const statement = this.statement.withoutValue(index);
		const remaining = statement.values.length;
		const target = forward && index < remaining ? index : Math.min(index - 1, remaining - 1);
		const field = target >= 0 ? InputFieldId.value(target) : InputFieldId.NEW_VALUE;

		return new StatementEditorState(statement, this.pending, { field, caret: forward ? 'start' : 'end' }, this.focusedField);
	}

	/**
	 * Remove the last value, as Backspace at the start of the empty new value does, or go back to
	 * the predicate when there is none.
	 * @returns The next state.
	 */
	previousValueRemoved(): StatementEditorState {
		const count = this.statement.values.length;

		if (count === 0) {
			return this.focusing(InputFieldId.PREDICATE, 'end');
		}

		return new StatementEditorState(this.statement.withoutValue(count - 1), this.pending, { field: InputFieldId.NEW_VALUE, caret: 'end' }, this.focusedField);
	}

	/**
	 * Start an empty literal in the field for a new value, as a typed quote does.
	 * @returns The next state.
	 */
	literalStarted(): StatementEditorState {
		const index = this.statement.values.length;

		return new StatementEditorState(this.statement.withValueAppended({ kind: 'literal', value: '', suffix: '' }), '', { field: InputFieldId.value(index), caret: 'start' }, this.focusedField);
	}

	/**
	 * Turn the text typed for a new value into a literal whose tag is being started.
	 * @param text The text of the literal.
	 * @param marker The marker of the tag: `@` for a language, `^^` for a datatype.
	 * @returns The next state.
	 */
	literalAppended(text: string, marker: '@' | '^^'): StatementEditorState {
		const index = this.statement.values.length;
		const value = marker === '^^' ? text.replace(/\^$/, '') : text;

		return new StatementEditorState(this.statement.withValueAppended({ kind: 'literal', value, suffix: marker }), '', { field: InputFieldId.tag(index), caret: 'end' }, this.focusedField);
	}

	/**
	 * Start the language tag or the datatype of a literal in the field after its text. A datatype
	 * is started by its second `^`, so the first one, already typed, leaves the text.
	 * @param index The index of the literal.
	 * @param marker The marker of the tag.
	 * @returns The next state, the state itself when the value is no literal.
	 */
	suffixStarted(index: number, marker: '@' | '^^'): StatementEditorState {
		const value = this.statement.values[index];

		if (value?.kind !== 'literal') {
			return this;
		}

		const text = marker === '^^' ? value.value.replace(/\^$/, '') : value.value;

		return new StatementEditorState(this.statement.withValue(index, { kind: 'literal', value: text, suffix: marker }), this.pending, { field: InputFieldId.tag(index), caret: 'end' }, this.focusedField);
	}

	/**
	 * Remove the language tag or datatype of a literal and go back to the end of its text.
	 * @param index The index of the literal.
	 * @returns The next state, the state itself when the value is no literal.
	 */
	suffixRemoved(index: number): StatementEditorState {
		const value = this.statement.values[index];

		if (value?.kind !== 'literal') {
			return this;
		}

		return new StatementEditorState(this.statement.withValue(index, { kind: 'literal', value: value.value, suffix: '' }), this.pending, { field: InputFieldId.value(index), caret: 'end' }, this.focusedField);
	}

	/**
	 * Move the caret to the field before or after another one.
	 * @param from The current field.
	 * @param direction Which way.
	 * @param stops Whether to walk the stops of Tab, passing the pills.
	 * @returns The next state, the state itself past the first or last field.
	 */
	movedToNeighbour(from: InputFieldId, direction: 'previous' | 'next', stops = false): StatementEditorState {
		const target = this.statement.neighbourField(from, direction, stops);

		return target ? this.focusing(target, direction === 'next' ? 'start' : 'end') : this;
	}

	/**
	 * Move the caret to the end of the row: the last value, or the field for a new value.
	 * @returns The next state.
	 */
	movedToRowEnd(): StatementEditorState {
		return this.focusing(this.statement.lastField(), 'end');
	}
}
