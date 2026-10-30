import { describe, expect, it } from 'vitest';
import { PersistedViewState } from './persisted-view-state';

describe('PersistedViewState', () => {
	it('starts from the initial state when nothing was stored', () => {
		expect(PersistedViewState.read(undefined)).toBe(PersistedViewState.INITIAL);
		expect(PersistedViewState.read('nonsense')).toBe(PersistedViewState.INITIAL);
	});

	it('repairs a state that lacks fields or holds them in another form', () => {
		expect(PersistedViewState.read({ font: 'mono' })).toEqual(new PersistedViewState());
		expect(PersistedViewState.read({ openIds: ['i:a', 3] }).openIds).toEqual([]);
		expect(PersistedViewState.read({ openIds: [], hideExternalDeclarations: 'yes' }).hideExternalDeclarations).toBeUndefined();
	});

	it('reads a state stored by an earlier version, ignoring what it no longer keeps', () => {
		expect(PersistedViewState.read({ version: 1, openIds: ['x'], mode: 'edit' })).toEqual(new PersistedViewState(['x']));
	});

	it('round trips through the stored form', () => {
		const state = new PersistedViewState(['x'], 'u', true);

		expect(state.toJSON()).toEqual({ documentUri: 'u', openIds: ['x'], hideExternalDeclarations: true });
		expect(PersistedViewState.read(JSON.parse(JSON.stringify(state)))).toEqual(state);
	});

	it('changes only the fields named', () => {
		const state = new PersistedViewState(['x'], 'u', true);

		expect(state.with({ openIds: ['y'] })).toEqual(new PersistedViewState(['y'], 'u', true));
		expect(state.with({ hideExternalDeclarations: undefined })).toEqual(new PersistedViewState(['x'], 'u'));
	});
});
