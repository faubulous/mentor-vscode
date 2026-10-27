import { describe, expect, it } from 'vitest';
import { PersistedViewState } from './persisted-view-state';

describe('PersistedViewState', () => {
	it('starts from the initial state when nothing was stored', () => {
		expect(PersistedViewState.read(undefined)).toBe(PersistedViewState.INITIAL);
		expect(PersistedViewState.read('nonsense')).toBe(PersistedViewState.INITIAL);
	});

	it('repairs a state that lacks fields or holds them in another form', () => {
		expect(PersistedViewState.read({ version: 1, font: 'mono' })).toEqual(new PersistedViewState());
		expect(PersistedViewState.read({ version: 1, openIds: ['i:a', 3] }).openIds).toEqual([]);
		expect(PersistedViewState.read({ version: 1, openIds: [], hideExternalDeclarations: 'yes' }).hideExternalDeclarations).toBeUndefined();
		expect(PersistedViewState.read({ version: 1, openIds: [], mode: 'write' }).mode).toBeUndefined();
	});

	it('round trips through the stored form', () => {
		const state = new PersistedViewState(['x'], 'u', true, 'edit');

		expect(state.toJSON()).toEqual({ version: 1, documentUri: 'u', openIds: ['x'], hideExternalDeclarations: true, mode: 'edit' });
		expect(PersistedViewState.read(JSON.parse(JSON.stringify(state)))).toEqual(state);
	});

	it('changes only the fields named', () => {
		const state = new PersistedViewState(['x'], 'u', true, 'edit');

		expect(state.with({ openIds: ['y'] })).toEqual(new PersistedViewState(['y'], 'u', true, 'edit'));
		expect(state.with({ mode: undefined, hideExternalDeclarations: undefined })).toEqual(new PersistedViewState(['x'], 'u'));
	});
});
