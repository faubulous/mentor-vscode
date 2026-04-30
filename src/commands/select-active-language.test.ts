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
			if (token === 'DocumentContextService') return mockContextService;
			if (token === 'SettingsService') return mockSettings;
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import { selectActiveLanguage } from '@src/commands/select-active-language';

describe('selectActiveLanguage', () => {
	let mockQuickPick: any;
	let changeSelectionHandlers: Array<(s: any[]) => void>;

	beforeEach(() => {
		vi.clearAllMocks();
		changeSelectionHandlers = [];

		mockQuickPick = {
			title: '',
			items: [] as any[],
			onDidChangeSelection: vi.fn((handler: any) => {
				changeSelectionHandlers.push(handler);
				return { dispose: () => {} };
			}),
			show: vi.fn(),
			dispose: vi.fn(),
		};

		(vscode.window as any).createQuickPick = vi.fn(() => mockQuickPick);
	});

	it('has the correct id', () => {
		expect(selectActiveLanguage.id).toBe('mentor.command.selectActiveLanguage');
	});

	it('returns early when no active editor', async () => {
		(vscode.window as any).activeTextEditor = undefined;
		await selectActiveLanguage.handler();
		expect(mockQuickPick.show).not.toHaveBeenCalled();
	});

	it('returns early when no document context', async () => {
		(vscode.window as any).activeTextEditor = { document: { uri: vscode.Uri.parse('file:///test.ttl') } };
		mockContextService.contexts = {};
		await selectActiveLanguage.handler();
		expect(mockQuickPick.show).not.toHaveBeenCalled();
	});

	it('shows quick pick with no language msg when no language-tagged literals', async () => {
		(vscode.window as any).activeTextEditor = { document: { uri: vscode.Uri.parse('file:///test.ttl') } };
		mockContextService.contexts = {
			'file:///test.ttl': {
				predicateStats: {},
				activeLanguageTag: undefined,
			}
		};
		await selectActiveLanguage.handler();
		expect(mockQuickPick.show).toHaveBeenCalled();
		expect(mockQuickPick.items[0].label).toBe('No language tagged literals found.');
	});

	it('shows language items when predicateStats has language-tagged literals', async () => {
		(vscode.window as any).activeTextEditor = { document: { uri: vscode.Uri.parse('file:///test.ttl') } };
		mockContextService.contexts = {
			'file:///test.ttl': {
				predicateStats: {
					'http://example.org/label': { languageTags: { 'en': 5, 'de': 3 } }
				},
				activeLanguageTag: undefined,
			}
		};
		await selectActiveLanguage.handler();
		expect(mockQuickPick.show).toHaveBeenCalled();
		const items: any[] = mockQuickPick.items;
		expect(items.length).toBe(2);
		expect(items.some((i: any) => i.language === 'en')).toBe(true);
		expect(items.some((i: any) => i.language === 'de')).toBe(true);
	});

	it('sets activeLanguageTag and saves settings on selection', async () => {
		const context = {
			predicateStats: {
				'http://example.org/label': { languageTags: { 'en': 5 } }
			},
			activeLanguageTag: undefined as string | undefined,
		};
		(vscode.window as any).activeTextEditor = { document: { uri: vscode.Uri.parse('file:///test.ttl') } };
		mockContextService.contexts = { 'file:///test.ttl': context };

		await selectActiveLanguage.handler();

		const enItem = mockQuickPick.items.find((i: any) => i.language === 'en');
		// Simulate user selecting the English language
		for (const handler of changeSelectionHandlers) {
			handler([enItem]);
		}

		expect(context.activeLanguageTag).toBe('en');
		expect(mockSettings.set).toHaveBeenCalledWith('view.activeLanguage', 'en');
		expect(mockQuickPick.dispose).toHaveBeenCalled();
	});

	it('handles undefined language tags (unspecified)', async () => {
		(vscode.window as any).activeTextEditor = { document: { uri: vscode.Uri.parse('file:///test.ttl') } };
		mockContextService.contexts = {
			'file:///test.ttl': {
				predicateStats: {
					'http://example.org/label': { languageTags: { 'undefined': 2 } }
				},
				activeLanguageTag: undefined,
			}
		};
		await selectActiveLanguage.handler();
		const items: any[] = mockQuickPick.items;
		// 'undefined' key should have language = undefined
		const unspecifiedItem = items.find((i: any) => i.language === undefined);
		expect(unspecifiedItem).toBeDefined();
	});
});
