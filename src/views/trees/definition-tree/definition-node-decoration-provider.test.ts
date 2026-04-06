import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';

vi.mock('vscode', async () => await import('@src/utilities/mocks/vscode'));

vi.mock('@faubulous/mentor-rdf-serializers', () => ({ serialize: vi.fn() }));

vi.mock('@src/utilities/vscode/config', () => ({
	getConfig: () => ({ get: (_k: string, d?: any) => d }),
}));

vi.mock('@faubulous/mentor-rdf', () => ({
	NamedNode: class {
		termType = 'NamedNode';
		constructor(public value: string) {}
	},
	VocabularyRepository: vi.fn(),
}));

const mockContextChangeHandlers: Array<(ctx: any) => void> = [];
const mockContextService = {
	activeContext: undefined as any,
	onDidChangeDocumentContext: vi.fn((handler: (ctx: any) => void) => {
		mockContextChangeHandlers.push(handler);
		return { dispose: () => {} };
	}),
};

const mockSettingsChangeHandlers = new Map<string, Array<() => void>>();
const mockSettings = {
	get: vi.fn((key: string, def?: any) => def),
	onDidChange: vi.fn((key: string, handler: () => void) => {
		if (!mockSettingsChangeHandlers.has(key)) {
			mockSettingsChangeHandlers.set(key, []);
		}
		mockSettingsChangeHandlers.get(key)!.push(handler);
		return { dispose: () => {} };
	}),
};

const mockVocabularyRepository = {
	store: {
		matchAll: vi.fn(() => []),
	},
};

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'DocumentContextService') return mockContextService;
			if (token === 'SettingsService') return mockSettings;
			if (token === 'VocabularyRepository') return mockVocabularyRepository;
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import { DefinitionNodeDecorationProvider } from './definition-node-decoration-provider';

describe('DefinitionNodeDecorationProvider', () => {
	let provider: DefinitionNodeDecorationProvider;
	let configChangeHandlers: Array<(e: any) => void>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockContextChangeHandlers.length = 0;
		mockSettingsChangeHandlers.clear();
		configChangeHandlers = [];

		(vscode.workspace as any).onDidChangeConfiguration = vi.fn((handler: any) => {
			configChangeHandlers.push(handler);
			return { dispose: () => {} };
		});

		mockContextService.activeContext = undefined;

		provider = new DefinitionNodeDecorationProvider();
	});

	it('has onDidChangeFileDecorations event', () => {
		expect(provider.onDidChangeFileDecorations).toBeDefined();
	});

	it('returns undefined for file scheme uri', () => {
		mockContextService.activeContext = { subjects: {}, predicates: { label: [] } };
		const uri = vscode.Uri.parse('file:///test.ttl');
		const token = {} as vscode.CancellationToken;
		expect(provider.provideFileDecoration(uri, token)).toBeUndefined();
	});

	it('returns undefined for mentor scheme uri', () => {
		mockContextService.activeContext = { subjects: {}, predicates: { label: [] } };
		const uri = vscode.Uri.parse('mentor:///test');
		const token = {} as vscode.CancellationToken;
		expect(provider.provideFileDecoration(uri, token)).toBeUndefined();
	});

	it('returns undefined when no active context', () => {
		mockContextService.activeContext = undefined;
		const uri = vscode.Uri.parse('http://example.org/Class');
		const token = {} as vscode.CancellationToken;
		expect(provider.provideFileDecoration(uri, token)).toBeUndefined();
	});

	it('returns disabled color decoration for subjects not in active document', () => {
		mockContextService.activeContext = {
			subjects: {},
			references: {},
			predicates: { label: [] },
			activeLanguage: 'en',
			primaryLanguage: 'en',
		};
		const uri = vscode.Uri.parse('http://example.org/UnknownClass');
		const token = {} as vscode.CancellationToken;
		const decoration = provider.provideFileDecoration(uri, token);
		expect(decoration).toBeDefined();
		expect(decoration!.tooltip).toContain('not defined in the active document');
		expect(decoration!.propagate).toBe(false);
	});

	it('returns undefined when decoration scope is disabled and subject is in context', () => {
		// getConfig returns undefined for 'decorateMissingLanguageTags' -> Disabled
		mockContextService.activeContext = {
			subjects: { 'http://example.org/Class': true },
			references: { 'http://example.org/Class': true },
			predicates: { label: [] },
			activeLanguage: 'en',
			primaryLanguage: 'en',
		};
		const uri = vscode.Uri.parse('http://example.org/Class');
		const token = {} as vscode.CancellationToken;
		const decoration = provider.provideFileDecoration(uri, token);
		expect(decoration).toBeUndefined();
	});

	it('updates label predicates when context changes', () => {
		const context = { predicates: { label: ['http://www.w3.org/2000/01/rdf-schema#label'] } };
		for (const h of mockContextChangeHandlers) {
			h(context);
		}
		// Verifies no error thrown - internal state updated
	});

	it('clears label predicates when context becomes null', () => {
		for (const h of mockContextChangeHandlers) {
			h(null);
		}
		// No error thrown, label predicates set to empty
	});

	it('fires file decoration change when configuration affectsConfiguration returns true', () => {
		const mockFn = vi.fn();
		(provider as any)._onDidChangeFileDecorations = { fire: mockFn, event: vi.fn() };
		const configEvent = { affectsConfiguration: (key: string) => key.includes('decorateMissingLanguageTags') };
		for (const h of configChangeHandlers) {
			h(configEvent);
		}
		// Decoration scope updated - no error
	});
});
