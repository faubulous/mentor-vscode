import { describe, expect, it } from 'vitest';
import { ResourceCardStates } from './resource-card-states';

describe('ResourceCardStates', () => {
	it('treats a card without an entry as collapsed', () => {
		expect(ResourceCardStates.NONE.stateOf('A')).toEqual({ open: 'collapsed' });
	});

	it('toggles between collapsed and open with the chevron', () => {
		const opened = ResourceCardStates.NONE.toggle('A');

		expect(opened.stateOf('A')).toEqual({ open: 'open' });
		expect(opened.toggle('A').openCards()).toEqual([]);
	});

	it('restores and reports the open cards', () => {
		const states = ResourceCardStates.fromOpenCards(['A', 'B']);

		expect(states.openCards()).toEqual(['A', 'B']);
		expect(states.toggle('C').openCards()).toEqual(['A', 'B', 'C']);
	});

	it('carries the state of a card over to the key of its resource after a rename', () => {
		const states = ResourceCardStates.NONE.toggle('A').renamed('A', 'B');

		expect(states.stateOf('B')).toEqual({ open: 'open' });
		expect(states.openCards()).toEqual(['B']);
		expect(ResourceCardStates.NONE.renamed('A', 'B').openCards()).toEqual([]);
	});
});
