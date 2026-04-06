import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as vscode from 'vscode';

vi.mock('vscode', async () => await import('@src/utilities/mocks/vscode'));

const mockSubscriptions: any[] = [];

vi.mock('tsyringe', () => ({
    container: {
        resolve: vi.fn((token: string) => {
            if (token === 'ExtensionContext') return { subscriptions: mockSubscriptions };
            return {};
        }),
    },
    injectable: () => (t: any) => t,
    inject: () => () => {},
    singleton: () => (t: any) => t,
}));

vi.mock('@src/services/tokens', () => ({
    ServiceToken: { ExtensionContext: 'ExtensionContext' },
}));

// The raw regex match[0] is "<IRI>inference" which is not a parseable URI in vscode-uri.
// Spy on Uri.parse to return a stable mock object so DocumentLink creation succeeds.
const mockUri = { scheme: 'http', toString: () => 'mock-uri' } as any;
let parseSpy: ReturnType<typeof vi.spyOn>;

describe('InferenceUriLinkProvider', () => {
    let InferenceUriLinkProvider: any;

    beforeEach(async () => {
        mockSubscriptions.length = 0;
        parseSpy = vi.spyOn(vscode.Uri, 'parse').mockReturnValue(mockUri);
        vi.resetModules();
        const mod = await import('./inference-uri-link-provider');
        InferenceUriLinkProvider = mod.InferenceUriLinkProvider;
    });

    afterEach(() => {
        parseSpy.mockRestore();
    });

    it('registers a document link provider on construction', () => {
        const provider = new InferenceUriLinkProvider();
        expect(mockSubscriptions.length).toBe(1);
        expect(provider).toBeDefined();
    });

    it('returns empty array when document text contains no inference URIs', () => {
        const provider = new InferenceUriLinkProvider();
        const doc = {
            getText: () => 'No inference graph URIs here.',
            positionAt: (offset: number) => new vscode.Position(0, offset),
        } as any;
        const links = provider.provideDocumentLinks(doc);
        expect(links).toEqual([]);
    });

    it('returns one DocumentLink for text ending with a single inference URI', () => {
        const provider = new InferenceUriLinkProvider();
        // InferenceUri.uriRegex = "(<[^\s>]+>)inference$" — matches <IRI>inference at end of string
        const text = '<http://example.org/ontology>inference';
        const doc = {
            getText: () => text,
            positionAt: (offset: number) => new vscode.Position(0, offset),
        } as any;
        const links = provider.provideDocumentLinks(doc);
        expect(links.length).toBe(1);
        expect(links[0]).toBeInstanceOf(vscode.DocumentLink);
    });

    it('link range covers the full matched text', () => {
        const provider = new InferenceUriLinkProvider();
        const text = '<http://example.org/ontology>inference';
        const doc = {
            getText: () => text,
            positionAt: (offset: number) => new vscode.Position(0, offset),
        } as any;
        const links = provider.provideDocumentLinks(doc);
        expect(links.length).toBe(1);
        // positionAt returns Position(0, offset), so character equals the offset
        expect(links[0].range.start.character).toBe(0);
        expect(links[0].range.end.character).toBe(text.length);
    });

    it('link start position is offset into the line when IRI appears mid-text', () => {
        const provider = new InferenceUriLinkProvider();
        const pre = 'GRAPH ';
        const match = '<http://example.org/ontology>inference';
        const text = pre + match;
        const doc = {
            getText: () => text,
            positionAt: (offset: number) => new vscode.Position(0, offset),
        } as any;
        const links = provider.provideDocumentLinks(doc);
        expect(links.length).toBe(1);
        expect(links[0].range.start.character).toBe(pre.length);
    });
});
