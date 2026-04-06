import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

vi.mock('@faubulous/mentor-rdf-serializers', () => ({
	TurtleFormatter: class TurtleFormatterMock {
		formatFromText(text: string) { return { output: text }; }
	},
	SparqlFormatter: class SparqlFormatterMock {
		formatFromText(text: string) { return { output: text }; }
	},
}));

vi.mock('@faubulous/mentor-rdf-parsers', async () => {
	const actual = await vi.importActual<any>('@faubulous/mentor-rdf-parsers');
	return {
		...actual,
		RdfToken: {
			...actual.RdfToken,
			PREFIX: { name: 'PREFIX' },
			TTL_PREFIX: { name: 'TTL_PREFIX' },
		},
	};
});

// Mock @src/languages/turtle to avoid circular dependency:
// turtle-language-client imports @src/languages (root index) which re-exports
// trig-language-client which extends TurtleLanguageClient — causing a circular ref.
vi.mock('@src/languages/turtle', async () => {
	const { LanguageClientBase } = await import('@src/languages/language-client');
	return {
		TurtleDocument: class TurtleDocument {
			setTokens = vi.fn();
			constructor(public uri: any, _syntax: any) {}
		},
		TurtleLanguageClient: class TurtleLanguageClient extends LanguageClientBase {
			constructor(public languageId = 'turtle', public languageName = 'Turtle') {
				super(languageId, languageName);
			}
		},
		TurtleTokenProvider: class TurtleTokenProvider {},
		TurtleFeatureProvider: class TurtleFeatureProvider {},
	};
});

const mockSubscriptions: any[] = [];

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'ExtensionContext') return { subscriptions: mockSubscriptions };
			if (token === 'DocumentContextService') return { onDidChangeDocumentContext: vi.fn() };
			if (token === 'SparqlConnectionService') return {
				onDidChangeConnectionForDocument: vi.fn(),
				onDidChangeConnections: vi.fn(),
			};
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import * as vscode from 'vscode';
import { SparqlTokenProvider } from './sparql-token-provider';

beforeEach(() => {
	mockSubscriptions.length = 0;
	vi.clearAllMocks();
});

describe('SparqlTokenProvider', () => {
	it('constructs without throwing', () => {
		expect(() => new SparqlTokenProvider()).not.toThrow();
	});

	it('pushes disposables to extension context subscriptions', () => {
		new SparqlTokenProvider();
		expect(mockSubscriptions.length).toBeGreaterThanOrEqual(1);
	});

	it('registers providers for sparql language', () => {
		const spy = vi.spyOn(vscode.languages, 'registerRenameProvider');
		new SparqlTokenProvider();
		expect(spy).toHaveBeenCalledWith({ language: 'sparql' }, expect.anything());
	});

	it('registers a code lens provider for sparql', () => {
		const spy = vi.spyOn(vscode.languages, 'registerCodeLensProvider');
		new SparqlTokenProvider();
		expect(spy).toHaveBeenCalledWith({ language: 'sparql' }, expect.anything());
	});

	it('registers a completion item provider for sparql', () => {
		const spy = vi.spyOn(vscode.languages, 'registerCompletionItemProvider');
		new SparqlTokenProvider();
		// The provider is registered with trigger characters spread as extra args
		const call = spy.mock.calls.find(args => (args[0] as any)?.language === 'sparql');
		expect(call).toBeDefined();
	});

	it('inline completion provider onComplete callback returns formatted IRI string', () => {
		const inlineSpy = vi.spyOn(vscode.languages, 'registerInlineCompletionItemProvider');
		new SparqlTokenProvider();
		// The sparql token provider registers a TurtlePrefixCompletionProvider with onComplete = (uri) => ` <${uri}>`
		const call = inlineSpy.mock.calls.find(args => (args[0] as any)?.language === 'sparql');
		expect(call).toBeDefined();
		const provider = call![1] as any;
		// Invoke the onComplete callback to cover the anonymous arrow function
		const result = provider.onComplete('http://example.org/');
		expect(result).toBe(' <http://example.org/>');
	});
});
