import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));
vi.mock('@faubulous/mentor-rdf-serializers', () => ({}));
vi.mock('@faubulous/mentor-rdf-parsers', () => ({
	RdfSyntax: { Turtle: 'Turtle', Sparql: 'Sparql' },
	RdfToken: {},
}));

const { MockXmlDocument } = vi.hoisted(() => {
        class MockXmlDocument {
                setParsedData = vi.fn();
                constructor(public uri: any) {}
        }
        return { MockXmlDocument };
});

const mockOnNotification = vi.fn((_method: string, _handler: any) => ({ dispose: () => {} }));
const mockContexts: Record<string, any> = {};
const mockResolveTokens = vi.fn();
const mockCreateDocument = vi.fn((uri: any, _langId: string) => new MockXmlDocument(uri));

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
                XmlDocument: MockXmlDocument,
        };
});

import { XmlLanguageClient } from './xml-language-client';

describe('XmlLanguageClient', () => {
        beforeEach(() => {
                vi.clearAllMocks();
                Object.keys(mockContexts).forEach(k => delete mockContexts[k]);
        });

        it('constructs without throwing', () => {
                expect(() => new XmlLanguageClient()).not.toThrow();
        });

        it('uses xml as languageId and RDF/XML as languageName', () => {
                const client = new XmlLanguageClient();
                expect(client.languageId).toBe('xml');
                expect(client.languageName).toBe('RDF/XML');
        });

        it('registers a notification handler for mentor.message.updateContext', () => {
                new XmlLanguageClient();
                expect(mockOnNotification).toHaveBeenCalledWith('mentor.message.updateContext', expect.any(Function));
        });

        it('creates document context when notification arrives for unknown URI', () => {
                new XmlLanguageClient();
                const handler = mockOnNotification.mock.calls[0][1];
                handler({ languageId: 'xml', uri: 'file:///doc.rdf', parsedData: { namespaces: {} } });
                expect(mockCreateDocument).toHaveBeenCalledWith(expect.anything(), 'xml');
        });

        it('calls setParsedData and resolveTokens when existing context is an XmlDocument', () => {
                const existingDoc = new MockXmlDocument(undefined);
                mockContexts['file:///doc.rdf'] = existingDoc;
                new XmlLanguageClient();
                const handler = mockOnNotification.mock.calls[0][1];
                const parsedData = { namespaces: { ex: 'http://example.org/' } };
                handler({ languageId: 'xml', uri: 'file:///doc.rdf', parsedData });
                expect(existingDoc.setParsedData).toHaveBeenCalledWith(parsedData);
                expect(mockResolveTokens).toHaveBeenCalledWith('file:///doc.rdf', []);
        });

        it('does not call setParsedData when context is not an XmlDocument', () => {
                const notXmlDoc = { setParsedData: vi.fn() };
                mockContexts['file:///doc.rdf'] = notXmlDoc;
                new XmlLanguageClient();
                const handler = mockOnNotification.mock.calls[0][1];
                handler({ languageId: 'xml', uri: 'file:///doc.rdf', parsedData: {} });
                expect(notXmlDoc.setParsedData).not.toHaveBeenCalled();
        });
});
