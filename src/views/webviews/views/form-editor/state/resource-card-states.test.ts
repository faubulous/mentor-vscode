import { describe, expect, it } from 'vitest';
import { ResourceCardStates } from './resource-card-states';

describe('ResourceCardStates', () => {
	it('treats a card without an entry as collapsed', () => {
		expect(ResourceCardStates.NONE.stateOf('A')).toEqual({ open: 'collapsed' });
	});

	it('opens a collapsed card for editing and leaves an open card as it is', () => {
		const opened = ResourceCardStates.NONE.open('A');

		expect(opened.stateOf('A')).toEqual({ open: 'edit' });
		expect(opened.open('A')).toBe(opened);
	});

	it('toggles between collapsed and open with the chevron', () => {
		const opened = ResourceCardStates.NONE.toggle('A');

		expect(opened.stateOf('A')).toEqual({ open: 'edit' });
		expect(opened.toggle('A').openIds()).toEqual([]);
	});

	it('collapses an open card', () => {
		expect(ResourceCardStates.NONE.open('A').collapse('A').openIds()).toEqual([]);
	});

	it('restores and reports the open cards', () => {
		const states = ResourceCardStates.fromOpenIds(['A', 'B']);

		expect(states.openIds()).toEqual(['A', 'B']);
		expect(states.open('C').openIds()).toEqual(['A', 'B', 'C']);
	});
});
