import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));
vi.mock('@faubulous/mentor-rdf-serializers', () => ({}));
vi.mock('@faubulous/mentor-rdf-parsers', () => ({
	RdfSyntax: { Turtle: 'Turtle', Sparql: 'Sparql' },
	RdfToken: {},
}));

const { MockTurtleDocument } = vi.hoisted(() => {
	class MockTurtleDocument {
		setTokens = vi.fn();
		resolveTokens = vi.fn();
		constructor(public uri: any, _syntax?: any) {}
	}
	return { MockTurtleDocument };
});

const mockOnNotification = vi.fn((_method: string, _handler: any) => ({ dispose: () => {} }));
const mockSubscriptions: { push: ReturnType<typeof vi.fn> } = { push: vi.fn() };

const mockContexts: Record<string, any> = {};
const mockResolveTokens = vi.fn();
const mockCreateDocument = vi.fn((uri: any, _langId: string) => new MockTurtleDocument(uri));

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'ExtensionContext') return { subscriptions: mockSubscriptions };
			if (token === 'LanguageClientFactory') {
				return () => ({
					start: vi.fn(async () => {}),
					stop: vi.fn(async () => {}),
					onNotification: mockOnNotification,
				});
			}
			if (token === 'DocumentContextService') {
				return { contexts: mockContexts, resolveTokens: mockResolveTokens };
			}
			if (token === 'DocumentFactory') {
				return { create: mockCreateDocument };
			}
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

// Mock @src/languages to break circular dependency:
// turtle-language-client imports @src/languages (root index) which re-exports
// trig-language-client which extends TurtleLanguageClient — causing a circular ref.
vi.mock('@src/languages', async () => {
	const { LanguageClientBase } = await import('@src/languages/language-client');
	return {
		LanguageClientBase,
		TurtleDocument: MockTurtleDocument,
	};
});

import { TurtleLanguageClient } from './turtle-language-client';

describe('TurtleLanguageClient', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		Object.keys(mockContexts).forEach(k => delete mockContexts[k]);
	});

	it('constructs without throwing', () => {
		expect(() => new TurtleLanguageClient()).not.toThrow();
	});

	it('uses turtle as default languageId and Turtle as languageName', () => {
		const client = new TurtleLanguageClient();
		expect(client.languageId).toBe('turtle');
		expect(client.languageName).toBe('Turtle');
	});

	it('accepts custom languageId and languageName', () => {
		const client = new TurtleLanguageClient('n3', 'N3');
		expect(client.languageId).toBe('n3');
		expect(client.languageName).toBe('N3');
	});

	it('registers a notification handler for mentor.message.updateContext', () => {
		new TurtleLanguageClient();
		expect(mockOnNotification).toHaveBeenCalledWith('mentor.message.updateContext', expect.any(Function));
	});

	it('creates document context when notification arrives for unknown URI', () => {
		new TurtleLanguageClient();
		const handler = mockOnNotification.mock.calls[0][1];
		handler({ languageId: 'turtle', uri: 'file:///a.ttl', tokens: [] });
		expect(mockCreateDocument).toHaveBeenCalledWith(expect.anything(), 'turtle');
	});

	it('calls setTokens and resolveTokens when existing context is a TurtleDocument', () => {
		const existingDoc = new MockTurtleDocument(undefined);
		mockContexts['file:///a.ttl'] = existingDoc;
		new TurtleLanguageClient();
		const handler = mockOnNotification.mock.calls[0][1];
		const tokens = [{ t: 1 }];
		handler({ languageId: 'turtle', uri: 'file:///a.ttl', tokens });
		expect(existingDoc.setTokens).toHaveBeenCalledWith(tokens);
		expect(mockResolveTokens).toHaveBeenCalledWith('file:///a.ttl', tokens);
	});

	it('reuses existing document context when notification arrives for known URI', () => {
		const existingDoc = { setTokens: vi.fn(), constructor: { name: 'TurtleDocument' } };
		mockContexts['file:///known.ttl'] = existingDoc;
		new TurtleLanguageClient();
		const handler = mockOnNotification.mock.calls[0][1];
		handler({ languageId: 'turtle', uri: 'file:///known.ttl', tokens: [{ t: 1 }] });
		// createDocument should NOT have been called with this URI since it was pre-existing
		expect(mockCreateDocument).not.toHaveBeenCalledWith(expect.objectContaining({ path: '/known.ttl' }), 'turtle');
	});
});
