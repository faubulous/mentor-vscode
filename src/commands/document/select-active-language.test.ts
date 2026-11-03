import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';

vi.mock('vscode', async () => await import('@src/utilities/mocks/vscode'));

vi.mock('@faubulous/mentor-rdf-serializers', () => ({ serialize: vi.fn() }));

vi.mock('@src/utilities/vscode/config', () => ({
	getConfig: () => ({ get: (_k: string, d?: any) => d }),
}));

vi.mock('@src/services/document/language-quick-pick', () => ({ pickLanguage: vi.fn() }));

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
import { pickLanguage } from '@src/services/document/language-quick-pick';
import { ServiceToken } from '@src/services/tokens';

/**
 * Make a document with a context the active text editor.
 * @returns The context of the document.
 */
function openDocument(): { languageTagStats: Record<string, number>; activeLanguageTag: string | undefined } {
	const context = { languageTagStats: { 'en': 5, 'de': 3 }, activeLanguageTag: undefined };

	(vscode.window as any).activeTextEditor = { document: { uri: vscode.Uri.parse('file:///test.ttl') } };
	mockContextService.contexts = { 'file:///test.ttl': context };

	return context;
}

describe('selectActiveLanguage', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('has the correct id', () => {
		expect(selectActiveLanguage.id).toBe('mentor.command.selectActiveLanguage');
	});

	it('returns early when no active editor', async () => {
		(vscode.window as any).activeTextEditor = undefined;
		await selectActiveLanguage.handler();
		expect(pickLanguage).not.toHaveBeenCalled();
	});

	it('reads the document of the active tab, as when a form editor holds the focus', async () => {
		const uri = vscode.Uri.parse('file:///form.ttl');
		const context = { languageTagStats: { 'en': 1 }, activeLanguageTag: undefined };

		(vscode.window as any).activeTextEditor = undefined;
		(vscode.window as any).tabGroups.activeTabGroup.activeTab = { input: { uri } };
		(vscode.workspace as any).textDocuments.push({ uri });
		mockContextService.contexts = { 'file:///form.ttl': context };

		try {
			await selectActiveLanguage.handler();
		} finally {
			(vscode.window as any).tabGroups.activeTabGroup.activeTab = undefined;
			(vscode.workspace as any).textDocuments.pop();
		}

		expect(pickLanguage).toHaveBeenCalledWith(context);
	});

	it('returns early when no document context', async () => {
		(vscode.window as any).activeTextEditor = { document: { uri: vscode.Uri.parse('file:///test.ttl') } };
		mockContextService.contexts = {};
		await selectActiveLanguage.handler();
		expect(pickLanguage).not.toHaveBeenCalled();
	});

	it('sets activeLanguageTag and saves settings on selection', async () => {
		const context = openDocument();

		vi.mocked(pickLanguage).mockResolvedValueOnce({ kind: 'language', language: 'en' });

		await selectActiveLanguage.handler();

		expect(context.activeLanguageTag).toBe('en');
		expect(mockSettings.set).toHaveBeenCalledWith('view.activeLanguage', 'en');
	});

	it('changes nothing when the pick is dismissed', async () => {
		const context = openDocument();

		vi.mocked(pickLanguage).mockResolvedValueOnce(undefined);

		await selectActiveLanguage.handler();

		expect(context.activeLanguageTag).toBeUndefined();
		expect(mockSettings.set).not.toHaveBeenCalled();
	});
});
