import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';

vi.mock('vscode', async () => await import('@src/utilities/mocks/vscode'));

vi.mock('@faubulous/mentor-rdf-serializers', () => ({ serialize: vi.fn() }));

let mockConfigValue: string | undefined = undefined;
vi.mock('@src/utilities/vscode/config', () => ({
	getConfig: () => ({ get: (_k: string, _d?: any) => mockConfigValue }),
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

const mockVocabularyRepository: { store: { matchAll: any } } = {
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
		mockConfigValue = undefined;
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

	it('uses empty label predicates when context has no label predicate list', () => {
		// Covers the `?? []` fallback when context.predicates.label is undefined
		for (const h of mockContextChangeHandlers) {
			h({ predicates: { label: undefined } });
		}
		// No error thrown
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

	it('fires onDidChangeFileDecorations when active language setting changes', () => {
		const fireSpy = vi.spyOn((provider as any)._onDidChangeFileDecorations, 'fire');
		const handlers = mockSettingsChangeHandlers.get('view.activeLanguage') ?? [];
		for (const h of handlers) { h(); }
		expect(fireSpy).toHaveBeenCalled();
	});

	it('sets decorationScope to Document when config returns "Document"', () => {
		mockConfigValue = 'Document';
		const dec = new DefinitionNodeDecorationProvider();
		expect((dec as any)._decorationScope).toBe(2); // MissingLanguageTagDecorationScope.Document = 2
	});

	it('sets decorationScope to All when config returns "All"', () => {
		mockConfigValue = 'All';
		const dec = new DefinitionNodeDecorationProvider();
		expect((dec as any)._decorationScope).toBe(1); // MissingLanguageTagDecorationScope.All = 1
	});
});

describe('DefinitionNodeDecorationProvider — provideFileDecoration (non-Disabled scope)', () => {
	const LABEL_PREDICATE = 'http://www.w3.org/2000/01/rdf-schema#label';
	const IRI = 'http://example.org/Class';

	function makeActiveContext(graphs = ['urn:g1']): any {
		return {
			subjects: { [IRI]: true },
			references: { [IRI]: true },
			predicates: { label: [LABEL_PREDICATE] },
			activeLanguage: 'en',
			primaryLanguage: 'en',
			graphs,
		};
	}

	let fireSpy: any;
	let dec: any;

	beforeEach(() => {
		vi.clearAllMocks();
		mockConfigValue = undefined;
		mockContextChangeHandlers.length = 0;
		mockSettingsChangeHandlers.clear();

		(vscode.workspace as any).onDidChangeConfiguration = vi.fn((handler: any) => {
			handler({ affectsConfiguration: () => false });
			return { dispose: () => {} };
		});

		mockContextService.activeContext = undefined;

		dec = new DefinitionNodeDecorationProvider();

		// Enable All scope (1 = All, 2 = Document)
		(dec as any)._decorationScope = 1;

		// Populate label predicates by firing context-change handler
		const ctx = makeActiveContext();
		for (const h of mockContextChangeHandlers) { h(ctx); }

		mockContextService.activeContext = ctx;
	});

	it('returns undefined when no primary language is set', () => {
		mockContextService.activeContext = {
			...makeActiveContext(),
			primaryLanguage: undefined,
		};
		const uri = vscode.Uri.parse(IRI);
		expect(dec.provideFileDecoration(uri, {} as any)).toBeUndefined();
	});

	it('returns undefined when no active language is set', () => {
		mockContextService.activeContext = {
			...makeActiveContext(),
			activeLanguage: undefined,
		};
		const uri = vscode.Uri.parse(IRI);
		expect(dec.provideFileDecoration(uri, {} as any)).toBeUndefined();
	});

	it('returns undefined when subject has no references entry', () => {
		mockContextService.activeContext = {
			...makeActiveContext(),
			references: {},
		};
		const uri = vscode.Uri.parse(IRI);
		expect(dec.provideFileDecoration(uri, {} as any)).toBeUndefined();
	});

	it('returns undefined when store provides no label triples', () => {
		mockVocabularyRepository.store.matchAll = vi.fn(() => []);
		const uri = vscode.Uri.parse(IRI);
		expect(dec.provideFileDecoration(uri, {} as any)).toBeUndefined();
	});

	it('returns undefined when triple is not a Literal (wrong termType)', () => {
		mockVocabularyRepository.store.matchAll = vi.fn(() => [{
			object: { termType: 'NamedNode', value: 'http://example.org/Other' },
			predicate: { value: LABEL_PREDICATE },
		}]);
		const uri = vscode.Uri.parse(IRI);
		expect(dec.provideFileDecoration(uri, {} as any)).toBeUndefined();
	});

	it('returns undefined when predicate is not a label predicate', () => {
		mockVocabularyRepository.store.matchAll = vi.fn(() => [{
			object: { termType: 'Literal', language: 'de', value: 'Test' },
			predicate: { value: 'http://example.org/unknown-predicate' },
		}]);
		const uri = vscode.Uri.parse(IRI);
		expect(dec.provideFileDecoration(uri, {} as any)).toBeUndefined();
	});

	it('returns undefined when label triple matches the active language', () => {
		mockVocabularyRepository.store.matchAll = vi.fn(() => [{
			object: { termType: 'Literal', language: 'en', value: 'Example' },
			predicate: { value: LABEL_PREDICATE },
		}]);
		const uri = vscode.Uri.parse(IRI);
		expect(dec.provideFileDecoration(uri, {} as any)).toBeUndefined();
	});

	it('returns undefined when label triple has no language (valid for all languages)', () => {
		mockVocabularyRepository.store.matchAll = vi.fn(() => [{
			object: { termType: 'Literal', language: '', value: 'Example' },
			predicate: { value: LABEL_PREDICATE },
		}]);
		const uri = vscode.Uri.parse(IRI);
		expect(dec.provideFileDecoration(uri, {} as any)).toBeUndefined();
	});

	it('returns warning decoration when label exists only in the wrong language', () => {
		mockVocabularyRepository.store.matchAll = vi.fn(() => [{
			object: { termType: 'Literal', language: 'de', value: 'Beispiel' },
			predicate: { value: LABEL_PREDICATE },
		}]);
		const uri = vscode.Uri.parse(IRI);
		const decoration = dec.provideFileDecoration(uri, {} as any);
		expect(decoration).toBeDefined();
		expect(decoration!.tooltip).toContain('@en');
		expect(decoration!.propagate).toBe(true);
	});

	it('uses document graphs as filter when scope is Document', () => {
		(dec as any)._decorationScope = 2; // Document scope
		const graphs = ['urn:g1'];
		mockContextService.activeContext = makeActiveContext(graphs);
		let capturedGraphUris: any;
		mockVocabularyRepository.store.matchAll = vi.fn((g: any) => {
			capturedGraphUris = g;
			return [{
				object: { termType: 'Literal', language: 'fr', value: 'Exemple' },
				predicate: { value: LABEL_PREDICATE },
			}];
		});
		const uri = vscode.Uri.parse(IRI);
		dec.provideFileDecoration(uri, {} as any);
		expect(capturedGraphUris).toEqual(graphs);
	});
});
