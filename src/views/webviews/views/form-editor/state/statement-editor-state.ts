import { InputFieldCaret, InputFieldFocusRequest } from '../input/input-field-focus-request';
import { InputFieldId } from '../input/input-field-id';
import { EditableStatement } from './editable-statement';
import { EditableValue } from './editable-value';

/**
 * The state of the fields of one statement row: the statement as edited, the text typed into
 * the field for a new value, the pill being edited as text, and the field to focus next.
 * Immutable: every transition returns the next state, and the field that is to take the focus
 * travels with it, so the row moves the caret once the field is drawn.
 */
export class StatementEditorState {
	/**
	 * Create a state.
	 * @param statement The statement as edited.
	 * @param pending The text typed into the field for a new value.
	 * @param editingPill The index of the resource value edited as text, if any.
	 * @param focusRequest The field to focus once it exists.
	 * @param focusedField The field that holds the caret, while the row is edited.
	 */
	constructor(
		readonly statement: EditableStatement,
		readonly pending = '',
		readonly editingPill?: number,
		readonly focusRequest?: InputFieldFocusRequest,
		readonly focusedField?: InputFieldId
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
		return new StatementEditorState(statement, this.pending, this.editingPill, this.focusRequest, this.focusedField);
	}

	/**
	 * Replace the text typed into the field for a new value.
	 * @param pending The text.
	 * @returns The next state.
	 */
	withPending(pending: string): StatementEditorState {
		return new StatementEditorState(this.statement, pending, this.editingPill, this.focusRequest, this.focusedField);
	}

	/**
	 * Ask for a field to take the focus.
	 * @param field The field.
	 * @param caret Where the caret goes.
	 * @returns The next state.
	 */
	focusing(field: InputFieldId, caret: InputFieldCaret): StatementEditorState {
		return new StatementEditorState(this.statement, this.pending, this.editingPill, { field, caret }, this.focusedField);
	}

	/**
	 * Note that the requested focus was given.
	 * @returns The next state, the state itself when no focus was requested.
	 */
	focusFulfilled(): StatementEditorState {
		return this.focusRequest ? new StatementEditorState(this.statement, this.pending, this.editingPill, undefined, this.focusedField) : this;
	}

	/**
	 * Note that a field took the focus: a pill edited as text is confirmed once the caret is in
	 * another field.
	 * @param field The field.
	 * @returns The next state, the state itself when the field had the focus already.
	 */
	fieldFocused(field: InputFieldId): StatementEditorState {
		if (field.equals(this.focusedField)) {
			return this;
		}

		const editingPill = this.editingPill !== undefined && field.equals(InputFieldId.value(this.editingPill)) ? this.editingPill : undefined;

		return new StatementEditorState(this.statement, this.pending, editingPill, this.focusRequest, field);
	}

	/**
	 * Note that the caret left the row: the text typed for a new value becomes a value, and a pill
	 * edited as text is confirmed.
	 * @param value The value read from the typed text, or `undefined` when nothing was typed.
	 * @returns The next state.
	 */
	left(value: EditableValue | undefined): StatementEditorState {
		return new StatementEditorState(this.pendingFolded(value).statement, '', undefined, undefined, undefined);
	}

	/**
	 * Take what was typed into the field for a new value as a value of the statement.
	 * @param value The value read from the typed text, or `undefined` when nothing was typed.
	 * @returns The next state, the state itself when nothing was typed.
	 */
	pendingFolded(value: EditableValue | undefined): StatementEditorState {
		return value ? new StatementEditorState(this.statement.withValueAppended(value), '', this.editingPill, this.focusRequest, this.focusedField) : this;
	}

	/**
	 * Edit the resource of a pill as text, replacing it with the typed character when there is one.
	 * @param index The index of the value.
	 * @param seed The typed character.
	 * @returns The next state.
	 */
	pillEdited(index: number, seed?: string): StatementEditorState {
		const statement = seed === undefined ? this.statement : this.statement.withValue(index, { kind: 'resource', text: seed });

		return new StatementEditorState(statement, this.pending, index, { field: InputFieldId.value(index), caret: 'end' }, this.focusedField);
	}

	/**
	 * Confirm the text of an edited pill and continue in the field for a new value.
	 * @returns The next state.
	 */
	pillConfirmed(): StatementEditorState {
		return new StatementEditorState(this.statement, this.pending, undefined, { field: InputFieldId.NEW_VALUE, caret: 'end' }, this.focusedField);
	}

	/**
	 * Take what was typed into the field for a new value as a value of the statement and continue
	 * in the emptied field.
	 * @param value The value read from the typed text, or `undefined` when nothing was typed.
	 * @returns The next state.
	 */
	typedValueCommitted(value: EditableValue | undefined): StatementEditorState {
		return new StatementEditorState(this.pendingFolded(value).statement, '', undefined, { field: InputFieldId.NEW_VALUE, caret: 'end' }, this.focusedField);
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

		return new StatementEditorState(statement, this.pending, undefined, { field, caret: forward ? 'start' : 'end' }, this.focusedField);
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

		return new StatementEditorState(this.statement.withoutValue(count - 1), this.pending, undefined, { field: InputFieldId.NEW_VALUE, caret: 'end' }, this.focusedField);
	}

	/**
	 * Start an empty literal in the field for a new value, as a typed quote does.
	 * @returns The next state.
	 */
	literalStarted(): StatementEditorState {
		const index = this.statement.values.length;

		return new StatementEditorState(this.statement.withValueAppended({ kind: 'literal', value: '', suffix: '' }), '', undefined, { field: InputFieldId.value(index), caret: 'start' }, this.focusedField);
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

		return new StatementEditorState(this.statement.withValueAppended({ kind: 'literal', value, suffix: marker }), '', undefined, { field: InputFieldId.tag(index), caret: 'end' }, this.focusedField);
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

		return new StatementEditorState(this.statement.withValue(index, { kind: 'literal', value: text, suffix: marker }), this.pending, this.editingPill, { field: InputFieldId.tag(index), caret: 'end' }, this.focusedField);
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

		return new StatementEditorState(this.statement.withValue(index, { kind: 'literal', value: value.value, suffix: '' }), this.pending, this.editingPill, { field: InputFieldId.value(index), caret: 'end' }, this.focusedField);
	}

	/**
	 * Move the caret to the field before or after another one.
	 * @param from The current field.
	 * @param direction Which way.
	 * @returns The next state, the state itself past the first or last field.
	 */
	movedToNeighbour(from: InputFieldId, direction: 'previous' | 'next'): StatementEditorState {
		const target = this.statement.neighbourField(from, direction);

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
