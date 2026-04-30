import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));
vi.mock('@faubulous/mentor-rdf-serializers', () => ({}));
vi.mock('@faubulous/mentor-rdf-parsers', () => ({
	RdfSyntax: { Turtle: 'Turtle', Sparql: 'Sparql' },
	RdfToken: {},
}));

const { MockSparqlDocument } = vi.hoisted(() => {
	class MockSparqlDocument {
		setTokens = vi.fn();
		resolveTokens = vi.fn();
		constructor(public uri: any) {}
	}
	return { MockSparqlDocument };
});

const mockOnNotification = vi.fn((_method: string, _handler: any) => ({ dispose: () => {} }));
const mockContexts: Record<string, any> = {};
const mockResolveTokens = vi.fn();
const mockCreateDocument = vi.fn((uri: any, _langId: string) => new MockSparqlDocument(uri));

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'ExtensionContext') return { subscriptions: { push: vi.fn() } };
			if (token === 'LanguageClientFactory') {
				return () => ({
					start: vi.fn(async () => {}),
					stop: vi.fn(async () => {}),
					onNotification: mockOnNotification,
				});
			}
			if (token === 'DocumentContextService') return { contexts: mockContexts, resolveTokens: mockResolveTokens };
			if (token === 'DocumentFactory') return { create: mockCreateDocument };
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

vi.mock('@src/languages', async () => {
	const { LanguageClientBase } = await import('@src/languages/language-client');
	return {
		LanguageClientBase,
		SparqlDocument: MockSparqlDocument,
	};
});

import { SparqlLanguageClient } from '@src/languages/sparql/sparql-language-client';

describe('SparqlLanguageClient', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		Object.keys(mockContexts).forEach(k => delete mockContexts[k]);
	});

	it('constructs without throwing', () => {
		expect(() => new SparqlLanguageClient()).not.toThrow();
	});

	it('uses sparql as languageId and SPARQL as languageName', () => {
		const client = new SparqlLanguageClient();
		expect(client.languageId).toBe('sparql');
		expect(client.languageName).toBe('SPARQL');
	});

	it('registers a notification handler for mentor.message.updateContext', () => {
		new SparqlLanguageClient();
		expect(mockOnNotification).toHaveBeenCalledWith('mentor.message.updateContext', expect.any(Function));
	});

	it('creates document context when notification arrives for unknown URI', () => {
		new SparqlLanguageClient();
		const handler = mockOnNotification.mock.calls[0][1];
		handler({ languageId: 'sparql', uri: 'file:///q.sparql', tokens: [] });
		expect(mockCreateDocument).toHaveBeenCalledWith(expect.anything(), 'sparql');
	});

	it('calls setTokens and resolveTokens when existing context is a SparqlDocument', () => {
		const existingDoc = new MockSparqlDocument(undefined);
		mockContexts['file:///q.sparql'] = existingDoc;
		new SparqlLanguageClient();
		const handler = mockOnNotification.mock.calls[0][1];
		const tokens = [{ t: 1 }];
		handler({ languageId: 'sparql', uri: 'file:///q.sparql', tokens });
		expect(existingDoc.setTokens).toHaveBeenCalledWith(tokens);
		expect(mockResolveTokens).toHaveBeenCalledWith('file:///q.sparql', tokens);
	});
});
