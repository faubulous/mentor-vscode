import { describe, expect, it } from 'vitest';
import { InputFieldId } from '../input/input-field-id';
import { EditableStatement } from './editable-statement';
import { StatementEditorState } from './statement-editor-state';

/**
 * The state the tests start from: a label with a tagged literal and a resource.
 */
function createState(): StatementEditorState {
	return StatementEditorState.of(new EditableStatement('rdfs:label', [{ kind: 'literal', value: 'Tree', suffix: '@en' }, { kind: 'resource', text: 'ex:A' }]));
}

describe('StatementEditorState', () => {
	it('carries the field to focus until it is fulfilled', () => {
		const state = createState().focusing(InputFieldId.value(1), 'end');

		expect(state.focusRequest).toEqual({ field: InputFieldId.value(1), caret: 'end' });
		const fulfilled = state.focusFulfilled();

		expect(fulfilled.focusRequest).toBeUndefined();
		expect(fulfilled.focusFulfilled()).toBe(fulfilled);
	});

	it('knows the focused field and confirms an edited pill once another field takes the focus', () => {
		const editing = createState().pillEdited(1, 'x');

		expect(editing.editingPill).toBe(1);
		expect(editing.statement.values[1]).toEqual({ kind: 'resource', text: 'x' });
		expect(editing.fieldFocused(InputFieldId.value(1)).editingPill).toBe(1);
		expect(editing.fieldFocused(InputFieldId.NEW_VALUE).editingPill).toBeUndefined();
		expect(editing.fieldFocused(InputFieldId.NEW_VALUE).focusedField).toBe(InputFieldId.NEW_VALUE);
		expect(editing.pillConfirmed().focusRequest?.field).toBe(InputFieldId.NEW_VALUE);
	});

	it('takes a typed value as a value and continues in the emptied field', () => {
		const state = createState().withPending('ex:B').typedValueCommitted({ kind: 'resource', text: 'ex:B' });

		expect(state.statement.values).toHaveLength(3);
		expect(state.pending).toBe('');
		expect(state.focusRequest).toEqual({ field: InputFieldId.NEW_VALUE, caret: 'end' });
		expect(createState().typedValueCommitted(undefined).statement.values).toHaveLength(2);
	});

	it('removes a value and puts the caret on the nearest one', () => {
		expect(createState().valueRemoved(1, false).focusRequest).toEqual({ field: InputFieldId.value(0), caret: 'end' });
		expect(createState().valueRemoved(0, true).focusRequest).toEqual({ field: InputFieldId.value(0), caret: 'start' });
		expect(createState().valueRemoved(0, false).valueRemoved(0, false).focusRequest).toEqual({ field: InputFieldId.NEW_VALUE, caret: 'end' });
		expect(createState().previousValueRemoved().statement.values).toHaveLength(1);
		expect(StatementEditorState.of(EditableStatement.EMPTY).previousValueRemoved().focusRequest?.field).toBe(InputFieldId.PREDICATE);
	});

	it('starts literals and their tags', () => {
		const started = createState().literalStarted();
		const appended = createState().withPending('x^').literalAppended('x^', '^^');
		const tagged = createState().suffixRemoved(0).suffixStarted(0, '@');

		expect(started.statement.values[2]).toEqual({ kind: 'literal', value: '', suffix: '' });
		expect(started.focusRequest).toEqual({ field: InputFieldId.value(2), caret: 'start' });
		expect(appended.statement.values[2]).toEqual({ kind: 'literal', value: 'x', suffix: '^^' });
		expect(appended.focusRequest).toEqual({ field: InputFieldId.tag(2), caret: 'end' });
		expect(tagged.statement.values[0]).toEqual({ kind: 'literal', value: 'Tree', suffix: '@' });
		const state = createState();

		expect(state.suffixStarted(1, '@')).toBe(state);
	});

	it('moves between neighbouring fields and to the end of the row', () => {
		expect(createState().movedToNeighbour(InputFieldId.PREDICATE, 'next').focusRequest).toEqual({ field: InputFieldId.value(0), caret: 'start' });
		expect(createState().movedToNeighbour(InputFieldId.PREDICATE, 'previous').focusRequest).toBeUndefined();
		expect(createState().movedToRowEnd().focusRequest).toEqual({ field: InputFieldId.value(1), caret: 'end' });
	});

	it('folds the typed value in when the row is left and forgets the focus', () => {
		const left = createState().withPending('x').fieldFocused(InputFieldId.NEW_VALUE).left({ kind: 'literal', value: 'x', suffix: '' });

		expect(left.statement.values).toHaveLength(3);
		expect(left.pending).toBe('');
		expect(left.focusedField).toBeUndefined();
		expect(createState().rowEmpty).toBe(false);
		expect(StatementEditorState.of(EditableStatement.EMPTY).rowEmpty).toBe(true);
	});
});
