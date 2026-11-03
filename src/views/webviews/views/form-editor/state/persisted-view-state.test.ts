import { describe, expect, it } from 'vitest';
import { PersistedViewState } from './persisted-view-state';

describe('PersistedViewState', () => {
	it('starts from the initial state when nothing was stored', () => {
		expect(PersistedViewState.read(undefined)).toBe(PersistedViewState.INITIAL);
		expect(PersistedViewState.read('nonsense')).toBe(PersistedViewState.INITIAL);
	});

	it('repairs a state that lacks fields or holds them in another form', () => {
		expect(PersistedViewState.read({ font: 'mono' })).toEqual(new PersistedViewState());
		expect(PersistedViewState.read({ openCards: ['http://example.org/a', 3] }).openCards).toEqual([]);
		expect(PersistedViewState.read({ openCards: [], hideExternalDeclarations: 'yes' }).hideExternalDeclarations).toBeUndefined();
	});

	it('reads a state stored by an earlier version, ignoring what it no longer keeps', () => {
		expect(PersistedViewState.read({ version: 1, openCards: ['x'], mode: 'edit' })).toEqual(new PersistedViewState(['x']));
	});

	it('drops the open cards stored by resource identifier, which name no card any more', () => {
		expect(PersistedViewState.read({ openIds: ['i:http://example.org/a'], documentUri: 'u' })).toEqual(new PersistedViewState([], 'u'));
	});

	it('round trips through the stored form', () => {
		const state = new PersistedViewState(['x'], 'u', true);

		expect(state.toJSON()).toEqual({ documentUri: 'u', openCards: ['x'], hideExternalDeclarations: true, allLanguages: undefined });
		expect(PersistedViewState.read(JSON.parse(JSON.stringify(state)))).toEqual(state);
	});

	it('reads and changes whether the values of every language are shown', () => {
		const state = PersistedViewState.read({ openCards: [], allLanguages: true });

		expect(state.allLanguages).toBe(true);
		expect(PersistedViewState.read({ allLanguages: 'yes' }).allLanguages).toBeUndefined();
		expect(state.with({ allLanguages: undefined }).allLanguages).toBeUndefined();
		expect(PersistedViewState.read(JSON.parse(JSON.stringify(state)))).toEqual(state);
	});

	it('changes only the fields named', () => {
		const state = new PersistedViewState(['x'], 'u', true);

		expect(state.with({ openCards: ['y'] })).toEqual(new PersistedViewState(['y'], 'u', true));
		expect(state.with({ hideExternalDeclarations: undefined })).toEqual(new PersistedViewState(['x'], 'u'));
	});
});
