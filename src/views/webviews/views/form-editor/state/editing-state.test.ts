import { describe, expect, it } from 'vitest';
import { CellKey } from './cell-key';
import { EditingState } from './editing-state';

const a = new CellKey({ resourceId: 'i:s', column: 'line', propertyIndex: 0 });
const b = new CellKey({ resourceId: 'i:s', column: 'line', propertyIndex: 1 });

describe('EditingState', () => {
	it('holds one editing cell at a time', () => {
		let state = EditingState.INITIAL.startEditing({ cellKey: a, mode: 'replace', seed: 'x' });

		expect(state.editing).toEqual({ cellKey: a, mode: 'replace', seed: 'x' });
		expect(state.isEditing(a)).toBe(true);

		state = state.startEditing({ cellKey: b, mode: 'append' });
		expect(state.isEditing(b)).toBe(true);
		expect(state.isEditing(a)).toBe(false);

		expect(state.stopEditing(a)).toBe(state);

		state = state.stopEditing();
		expect(state.editing).toBeUndefined();
		expect(state.stopEditing()).toBe(state);
	});

	it('keeps a focus request until it is fulfilled', () => {
		let state = EditingState.INITIAL.requestFocus(a);

		expect(state.focusRequest).toBe(a);

		state = state.requestFocus(b);
		expect(state.focusRequest).toBe(b);

		state = state.focusFulfilled();
		expect(state.focusRequest).toBeUndefined();
		expect(state.focusFulfilled()).toBe(state);
	});

	it('records and clears errors by cell', () => {
		let state = EditingState.INITIAL.withError(b, 'no', 'notFound');

		expect(state.errorForRow('i:s', 1)).toEqual({ cellKey: b, message: 'no', reason: 'notFound' });
		expect(state.errorForRow('i:s', 0)).toBeUndefined();
		expect(state.errorForCell(b)?.message).toBe('no');
		expect(state.errorForCell(a)).toBeUndefined();

		state = state.withoutError(b);
		expect(state.errors.size).toBe(0);
		expect(state.withoutError(b)).toBe(state);
	});

	it('leaves the other parts alone on every transition', () => {
		const state = EditingState.INITIAL.startEditing({ cellKey: a, mode: 'append' }).requestFocus(b).withError(a, 'x');

		expect(state.stopEditing().focusRequest).toBe(b);
		expect(state.focusFulfilled().editing?.cellKey).toBe(a);
		expect(state.withoutError(a).editing?.cellKey).toBe(a);
	});
});
