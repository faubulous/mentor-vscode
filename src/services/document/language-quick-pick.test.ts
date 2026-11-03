import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';

vi.mock('vscode', async () => await import('@src/utilities/mocks/vscode'));

import { IDocumentContext } from './document-context.interface';
import { pickLanguage } from './language-quick-pick';

/**
 * A quick pick stub whose selection and hiding the tests drive.
 */
interface QuickPickStub {
	title: string;
	items: any[];
	activeItems: any[];
	shown: boolean;
	disposed: boolean;
	select(item: any): void;
	hide(): void;
}

let quickPick: QuickPickStub;

/**
 * The context of a document with language statistics.
 * @param languageTagStats The number of values by language tag.
 * @param activeLanguageTag The language the document is read in.
 */
function contextOf(languageTagStats: Record<string, number>, activeLanguageTag?: string): IDocumentContext {
	return { languageTagStats, activeLanguageTag } as unknown as IDocumentContext;
}

/**
 * The item of the quick pick that chooses a language.
 * @param language The language tag, or `undefined` for the values without a language.
 */
function itemOf(language: string | undefined): any {
	return quickPick.items.find(item => item.choice?.kind === 'language' && item.choice.language === language);
}

describe('pickLanguage', () => {
	beforeEach(() => {
		const selectionHandlers: ((selection: any[]) => void)[] = [];
		const hideHandlers: (() => void)[] = [];

		quickPick = {
			title: '',
			items: [],
			activeItems: [],
			shown: false,
			disposed: false,
			select: item => selectionHandlers.forEach(handler => handler([item])),
			hide: () => hideHandlers.forEach(handler => handler())
		};

		(vscode.window as any).createQuickPick = vi.fn(() => Object.assign(quickPick, {
			onDidChangeSelection: (handler: any) => { selectionHandlers.push(handler); return { dispose: () => { } }; },
			onDidHide: (handler: any) => { hideHandlers.push(handler); return { dispose: () => { } }; },
			show: () => { quickPick.shown = true; },
			dispose: () => { quickPick.disposed = true; }
		}));
	});

	it('lists the values without a language first, then the languages by their tags, with their counts', () => {
		void pickLanguage(contextOf({ 'en': 5, 'de': 1, 'undefined': 2 }));

		expect(quickPick.shown).toBe(true);
		expect(quickPick.items.map(item => item.choice.language)).toEqual([undefined, 'de', 'en']);
		expect(quickPick.items.map(item => item.description)).toEqual(['2 values', '1 value', '5 values']);
	});

	it('resolves with the language picked and closes', async () => {
		const pick = pickLanguage(contextOf({ 'en': 5, 'de': 3 }));

		quickPick.select(itemOf('de'));

		expect(await pick).toEqual({ kind: 'language', language: 'de' });
		expect(quickPick.disposed).toBe(true);
	});

	it('resolves with nothing when dismissed', async () => {
		const pick = pickLanguage(contextOf({ 'en': 5 }));

		quickPick.hide();

		expect(await pick).toBeUndefined();
	});

	it('starts on the language the document is read in', () => {
		void pickLanguage(contextOf({ 'en': 5, 'de': 3 }, 'de'));

		expect(quickPick.activeItems).toEqual([itemOf('de')]);
	});

	it('offers the values of every language first where asked, starting on it while they are shown', async () => {
		const pick = pickLanguage(contextOf({ 'en': 5, 'de': 3 }, 'de'), { offerAllLanguages: true, allLanguagesShown: true });
		const allLanguages = quickPick.items[0];

		expect(allLanguages.label).toBe('All languages');
		expect(quickPick.activeItems).toEqual([allLanguages]);

		quickPick.select(allLanguages);

		expect(await pick).toEqual({ kind: 'allLanguages' });
	});

	it('offers no choice for a document without language tags', async () => {
		const pick = pickLanguage(contextOf({}), { offerAllLanguages: true });

		expect(quickPick.items).toEqual([{ label: 'No language tagged literals found.' }]);

		quickPick.select(quickPick.items[0]);
		quickPick.hide();

		expect(await pick).toBeUndefined();
	});
});
