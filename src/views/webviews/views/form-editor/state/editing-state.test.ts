import { describe, expect, it } from 'vitest';
import { CellKey } from './cell-key';
import { EditingState } from './editing-state';

const a = new CellKey({ resourceId: 'i:s', column: 'statement', propertyIndex: 0 });
const b = new CellKey({ resourceId: 'i:s', column: 'statement', propertyIndex: 1 });

describe('EditingState', () => {
	it('keeps a focus request until it is fulfilled', () => {
		let state = EditingState.INITIAL.requestFocus(a);

		expect(state.focusRequest).toBe(a);

		state = state.requestFocus(b);
		expect(state.focusRequest).toBe(b);

		state = state.focusFulfilled();
		expect(state.focusRequest).toBeUndefined();
		expect(state.focusFulfilled()).toBe(state);
	});

	it('records and clears errors by row', () => {
		let state = EditingState.INITIAL.withError(b, 'no', 'notFound');

		expect(state.errorForRow('i:s', 1)).toEqual({ cellKey: b, message: 'no', reason: 'notFound' });
		expect(state.errorForRow('i:s', 0)).toBeUndefined();
		expect(state.errorForCell(b)?.message).toBe('no');
		expect(state.errorForCell(a)).toBeUndefined();

		state = state.withoutError(b);
		expect(state.errors.size).toBe(0);
		expect(state.withoutError(b)).toBe(state);
	});

	it('leaves the other part alone on every transition', () => {
		const state = EditingState.INITIAL.requestFocus(b).withError(a, 'x');

		expect(state.withoutError(a).focusRequest).toBe(b);
		expect(state.focusFulfilled().errorForCell(a)?.message).toBe('x');
	});
});
