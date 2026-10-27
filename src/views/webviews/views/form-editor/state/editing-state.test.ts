import { describe, expect, it } from 'vitest';
import { INITIAL_EDITING_STATE, editingStateReducer, errorForCell, errorForRow } from './editing-state';

describe('editingStateReducer', () => {
	it('holds one editing cell at a time', () => {
		let state = editingStateReducer(INITIAL_EDITING_STATE, { type: 'startEditing', cell: { cellKey: 'a', mode: 'replace', seed: 'x' } });

		expect(state.editing).toEqual({ cellKey: 'a', mode: 'replace', seed: 'x' });

		state = editingStateReducer(state, { type: 'startEditing', cell: { cellKey: 'b', mode: 'append' } });
		expect(state.editing?.cellKey).toBe('b');

		state = editingStateReducer(state, { type: 'stopEditing', cellKey: 'a' });
		expect(state.editing?.cellKey).toBe('b');

		state = editingStateReducer(state, { type: 'stopEditing' });
		expect(state.editing).toBeUndefined();
	});

	it('keeps a focus request until it is fulfilled', () => {
		let state = editingStateReducer(INITIAL_EDITING_STATE, { type: 'requestFocus', cellKey: 'a' });

		expect(state.focusRequest).toEqual({ cellKey: 'a' });

		state = editingStateReducer(state, { type: 'requestFocus', cellKey: 'b', caret: 'end' });
		expect(state.focusRequest).toEqual({ cellKey: 'b', caret: 'end' });

		state = editingStateReducer(state, { type: 'focusFulfilled' });
		expect(state.focusRequest).toBeUndefined();
		expect(editingStateReducer(state, { type: 'focusFulfilled' })).toBe(state);
	});

	it('records and clears errors by cell', () => {
		let state = editingStateReducer(INITIAL_EDITING_STATE, { type: 'setError', cellKey: 'i:s|line|1||', message: 'no', reason: 'notFound' });

		expect(errorForRow(state.errors, 'i:s', 1)).toEqual({ cellKey: 'i:s|line|1||', message: 'no', reason: 'notFound' });
		expect(errorForRow(state.errors, 'i:s', 0)).toBeUndefined();
		expect(errorForCell(state.errors, 'i:s|line|1||')?.message).toBe('no');
		expect(errorForCell(state.errors, 'i:s|subject|||')).toBeUndefined();

		state = editingStateReducer(state, { type: 'clearError', cellKey: 'i:s|line|1||' });
		expect(state.errors).toEqual({});
		expect(editingStateReducer(state, { type: 'clearError', cellKey: 'i:s|line|1||' })).toBe(state);
	});
});
