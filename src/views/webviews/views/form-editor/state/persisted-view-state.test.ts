import { describe, expect, it } from 'vitest';
import { INITIAL_VIEW_STATE, readViewState } from './persisted-view-state';

describe('readViewState', () => {
	it('starts from the initial state when nothing was stored', () => {
		expect(readViewState(undefined)).toEqual(INITIAL_VIEW_STATE);
		expect(readViewState('nonsense')).toEqual(INITIAL_VIEW_STATE);
	});

	it('repairs a state that lacks fields or holds them in another form', () => {
		expect(readViewState({ version: 1, font: 'mono' })).toEqual({ version: 1, documentUri: undefined, openIds: [], hideExternalDeclarations: undefined, mode: undefined });
		expect(readViewState({ version: 1, openIds: ['i:a', 3] }).openIds).toEqual([]);
	});

	it('reads whether external declarations are hidden', () => {
		expect(readViewState({ version: 1, openIds: [], hideExternalDeclarations: true }).hideExternalDeclarations).toBe(true);
		expect(readViewState({ version: 1, openIds: [], hideExternalDeclarations: 'yes' }).hideExternalDeclarations).toBeUndefined();
	});

	it('keeps a current state as it is', () => {
		expect(readViewState({ version: 1, documentUri: 'u', openIds: ['x'] })).toMatchObject({ version: 1, documentUri: 'u', openIds: ['x'] });
	});

	it('reads the mode, editing only when chosen', () => {
		expect(readViewState({ version: 1, openIds: [], mode: 'edit' }).mode).toBe('edit');
		expect(readViewState({ version: 1, openIds: [], mode: 'write' }).mode).toBeUndefined();
	});
});
