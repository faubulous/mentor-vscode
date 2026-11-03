import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';

vi.mock('vscode', async () => await import('@src/utilities/mocks/vscode'));

vi.mock('@faubulous/mentor-rdf-serializers', () => ({ serialize: vi.fn() }));

vi.mock('@src/utilities/vscode/config', () => ({
	getConfig: () => ({ get: (_k: string, d?: any) => d }),
}));

const mockContextService = {
	contexts: {} as Record<string, any>,
};

const mockSettings = {
	set: vi.fn(),
};

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === ServiceToken.DocumentContextService) return mockContextService;
			if (token === ServiceToken.SettingsService) return mockSettings;
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import { selectActiveLanguage } from '@src/commands/document/select-active-language';
import { ServiceToken } from '@src/services/tokens';

/**
 * A quick pick stub whose selection and hiding the tests drive.
 */
interface QuickPickStub {
	items: any[];
	activeItems: any[];
	shown: boolean;
	disposed: boolean;
	select(item: any): void;
	hide(): void;
}

let quickPick: QuickPickStub;

/**
 * The context of a document, as the active text editor shows it.
 * @param languageTagStats The number of values by language tag.
 * @param activeLanguageTag The language the document is read in.
 * @returns The context.
 */
function openDocument(languageTagStats: Record<string, number>, activeLanguageTag?: string): { languageTagStats: Record<string, number>; activeLanguageTag: string | undefined } {
	const context = { languageTagStats, activeLanguageTag };

	(vscode.window as any).activeTextEditor = { document: { uri: vscode.Uri.parse('file:///test.ttl') } };
	mockContextService.contexts = { 'file:///test.ttl': context };

	return context;
}

/**
 * Run the command and wait until its quick pick is shown.
 * @param options The options of the command.
 * @returns The choice the command resolves with, once the pick is closed.
 */
async function showPick(options?: Parameters<typeof selectActiveLanguage.handler>[0]): Promise<{ result: ReturnType<typeof selectActiveLanguage.handler> }> {
	const result = selectActiveLanguage.handler(options);

	await vi.waitFor(() => expect(quickPick.shown).toBe(true));

	return { result };
}

/**
 * The item of the quick pick that chooses a language.
 * @param language The language tag, or `undefined` for the values without a language.
 */
function itemOf(language: string | undefined): any {
	return quickPick.items.find(item => item.choice?.kind === 'language' && item.choice.language === language);
}

describe('selectActiveLanguage', () => {
	beforeEach(() => {
		const selectionHandlers: ((selection: any[]) => void)[] = [];
		const hideHandlers: (() => void)[] = [];

		vi.clearAllMocks();

		quickPick = {
			items: [],
			activeItems: [],
			shown: false,
			disposed: false,
			select: item => selectionHandlers.forEach(handler => handler([item])),
			hide: () => hideHandlers.forEach(handler => handler())
		};

		(vscode.window as any).createQuickPick = vi.fn(() => Object.assign(quickPick, {
			onDidChangeSelection: (handler: any) => {
				selectionHandlers.push(handler);

				return { dispose: () => { } };
			},
			onDidHide: (handler: any) => {
				hideHandlers.push(handler);

				return { dispose: () => { } };
			},
			show: () => {
				quickPick.shown = true;
			},
			dispose: () => {
				quickPick.disposed = true;
			}
		}));
	});

	it('has the correct id', () => {
		expect(selectActiveLanguage.id).toBe('mentor.command.selectActiveLanguage');
	});

	it('returns early when no active editor', async () => {
		(vscode.window as any).activeTextEditor = undefined;

		expect(await selectActiveLanguage.handler()).toBeUndefined();
		expect(vscode.window.createQuickPick).not.toHaveBeenCalled();
	});

	it('returns early when no document context', async () => {
		(vscode.window as any).activeTextEditor = { document: { uri: vscode.Uri.parse('file:///test.ttl') } };
		mockContextService.contexts = {};

		expect(await selectActiveLanguage.handler()).toBeUndefined();
		expect(vscode.window.createQuickPick).not.toHaveBeenCalled();
	});

	it('reads the document of the active tab, as when a form editor holds the focus', async () => {
		const uri = vscode.Uri.parse('file:///form.ttl');

		(vscode.window as any).activeTextEditor = undefined;
		(vscode.window as any).tabGroups.activeTabGroup.activeTab = { input: { uri } };
		(vscode.workspace as any).textDocuments.push({ uri });
		mockContextService.contexts = { 'file:///form.ttl': { languageTagStats: { 'en': 1 }, activeLanguageTag: undefined } };

		try {
			const { result } = await showPick();

			quickPick.hide();
			await result;
		} finally {
			(vscode.window as any).tabGroups.activeTabGroup.activeTab = undefined;
			(vscode.workspace as any).textDocuments.pop();
		}

		expect(quickPick.items.map(item => item.choice.language)).toEqual(['en']);
	});

	it('lists the values without a language first, then the languages by their tags, with their counts', async () => {
		openDocument({ 'en': 5, 'de': 1, 'undefined': 2 });

		const { result } = await showPick();

		expect(quickPick.items.map(item => item.choice.language)).toEqual([undefined, 'de', 'en']);
		expect(quickPick.items.map(item => item.description)).toEqual(['2 values', '1 value', '5 values']);

		quickPick.hide();
		await result;
	});

	it('offers no choice for a document without language tags', async () => {
		openDocument({});

		const { result } = await showPick();

		expect(quickPick.items).toEqual([{ label: 'No language tagged literals found.' }]);

		quickPick.select(quickPick.items[0]);
		quickPick.hide();

		expect(await result).toBeUndefined();
	});

	it('starts on the language the document is read in', async () => {
		openDocument({ 'en': 5, 'de': 3 }, 'de');

		const { result } = await showPick();

		expect(quickPick.activeItems).toEqual([itemOf('de')]);

		quickPick.hide();
		await result;
	});

	it('reads the document in the language picked, tells the views and closes', async () => {
		const context = openDocument({ 'en': 5, 'de': 3 });
		const { result } = await showPick();
		quickPick.select(itemOf('de'));

		expect(await result).toEqual({ kind: 'language', language: 'de' });
		expect(context.activeLanguageTag).toBe('de');
		expect(mockSettings.set).toHaveBeenCalledWith('view.activeLanguage', 'de');
		expect(quickPick.disposed).toBe(true);
	});

	it('changes nothing when dismissed', async () => {
		const context = openDocument({ 'en': 5 });
		const { result } = await showPick();
		quickPick.hide();

		expect(await result).toBeUndefined();
		expect(context.activeLanguageTag).toBeUndefined();
		expect(mockSettings.set).not.toHaveBeenCalled();
	});

	it('offers the values of every language first where asked, starting on it while they are shown, leaving the language of the document', async () => {
		const context = openDocument({ 'en': 5, 'de': 3 }, 'de');
		const { result } = await showPick({ offerAllLanguages: true, allLanguagesShown: true });
		const allLanguages = quickPick.items[0];

		expect(allLanguages.label).toBe('All languages');
		expect(quickPick.activeItems).toEqual([allLanguages]);

		quickPick.select(allLanguages);

		expect(await result).toEqual({ kind: 'allLanguages' });
		expect(context.activeLanguageTag).toBe('de');
		expect(mockSettings.set).not.toHaveBeenCalled();
	});
});
