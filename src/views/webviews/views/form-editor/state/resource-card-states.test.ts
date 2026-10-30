import { describe, expect, it } from 'vitest';
import { ResourceCardStates } from './resource-card-states';

describe('ResourceCardStates', () => {
	it('treats a card without an entry as collapsed', () => {
		expect(ResourceCardStates.NONE.stateOf('A')).toEqual({ open: 'collapsed' });
	});

	it('toggles between collapsed and open with the chevron', () => {
		const opened = ResourceCardStates.NONE.toggle('A');

		expect(opened.stateOf('A')).toEqual({ open: 'open' });
		expect(opened.toggle('A').openIds()).toEqual([]);
	});

	it('restores and reports the open cards', () => {
		const states = ResourceCardStates.fromOpenIds(['A', 'B']);

		expect(states.openIds()).toEqual(['A', 'B']);
		expect(states.toggle('C').openIds()).toEqual(['A', 'B', 'C']);
	});
});
