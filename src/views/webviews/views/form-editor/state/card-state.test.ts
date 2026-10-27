import { describe, expect, it } from 'vitest';
import { CardStateAction, CardStates, cardStateOf, cardStateReducer, cardStatesFromOpenIds, openCardIds } from './card-state';

/**
 * Apply a sequence of transitions to empty states.
 */
function reduce(...actions: CardStateAction[]): CardStates {
	return actions.reduce(cardStateReducer, {});
}

describe('cardStateReducer', () => {
	it('treats a card without an entry as collapsed', () => {
		expect(cardStateOf({}, 'A')).toEqual({ open: 'collapsed' });
	});

	it('opens a collapsed card for editing', () => {
		expect(reduce({ type: 'open', id: 'A' })).toEqual({ A: { open: 'edit' } });
	});

	it('leaves an open card as it is when opened again', () => {
		const states = reduce({ type: 'open', id: 'A' });

		expect(cardStateReducer(states, { type: 'open', id: 'A' })).toBe(states);
	});

	it('toggles between collapsed and open with the chevron', () => {
		const opened = reduce({ type: 'toggle', id: 'A' });

		expect(opened).toEqual({ A: { open: 'edit' } });
		expect(cardStateReducer(opened, { type: 'toggle', id: 'A' })).toEqual({});
	});

	it('collapses an open card', () => {
		expect(reduce({ type: 'open', id: 'A' }, { type: 'collapse', id: 'A' })).toEqual({});
	});

	it('restores and reports the open cards', () => {
		const states = cardStateReducer(reduce({ type: 'open', id: 'X' }), { type: 'reset', openIds: ['A', 'B'] });

		expect(states).toEqual(cardStatesFromOpenIds(['A', 'B']));
		expect(openCardIds(cardStateReducer(states, { type: 'open', id: 'C' }))).toEqual(['A', 'B', 'C']);
	});
});
