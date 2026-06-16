import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as vscode from 'vscode';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

const { mockGetConfig, mockGetContext, mockImplementPrefixes, mockContextService } = vi.hoisted(() => {
    const mockGetContext = vi.fn(() => null as any);
    const mockImplementPrefixes = vi.fn(async () => ({ size: 0 }));
    const mockContextService = {
        onDidChangeDocumentContext: vi.fn((_handler?: any) => ({ dispose: vi.fn() })),
        getContext: mockGetContext,
        contexts: {},
    };
    const mockGetConfig = vi.fn(() => ({ get: (_k: string, d?: any) => d }));
    return { mockGetConfig, mockGetContext, mockImplementPrefixes, mockContextService };
});

vi.mock('@src/utilities/vscode/config', () => ({
    getConfig: mockGetConfig,
}));

vi.mock('tsyringe', () => ({
    container: {
        resolve: vi.fn((token: string) => {
            if (token === 'DocumentContextService') return mockContextService;
            if (token === 'TurtlePrefixDefinitionService') return { implementPrefixes: mockImplementPrefixes };
            return {};
        }),
    },
    injectable: () => (target: any) => target,
    inject: () => (_target: any, _key: any, _index: any) => {},
    singleton: () => (target: any) => target,
}));

import { TurtleAutoDefinePrefixProvider } from '@src/languages/turtle/providers/turtle-auto-define-prefix-provider';

beforeEach(() => {
    vi.clearAllMocks();
    mockGetConfig.mockReturnValue({ get: (_k: string, d?: any) => d });
    mockGetContext.mockReturnValue(null);
    mockImplementPrefixes.mockResolvedValue({ size: 0 });
    mockContextService.onDidChangeDocumentContext.mockReturnValue({ dispose: vi.fn() });
});

afterEach(() => {
    // Reset the shared textDocuments array between tests
    (vscode.workspace.textDocuments as any[]).length = 0;
});

// Helper: create a mock document with a given URI string
function makeDoc(uri: string): any {
    return { uri: { toString: () => uri }, languageId: 'turtle' };
}

// Helper: create a mock context that returns the given token index and token list
function makeContext(tokenIndex: number, tokens: any[], namespaces: Record<string, string> = {}): any {
    return {
        getTokenIndexAtPosition: vi.fn(() => tokenIndex),
        tokens,
        namespaces,
    };
}

const PNAME_NS = 'PNAME_NS';

describe('TurtleAutoDefinePrefixProvider', () => {
    it('constructs without throwing', () => {
        expect(() => new TurtleAutoDefinePrefixProvider(['turtle'])).not.toThrow();
    });

    it('accepts an empty language list', () => {
        expect(() => new TurtleAutoDefinePrefixProvider([])).not.toThrow();
    });

    it('accepts multiple languages', () => {
        expect(() => new TurtleAutoDefinePrefixProvider(['turtle', 'trig', 'n3'])).not.toThrow();
    });

    it('dispose() does not throw', () => {
        const provider = new TurtleAutoDefinePrefixProvider(['turtle']);
        expect(() => provider.dispose()).not.toThrow();
    });

    it('dispose() can be called multiple times without throwing', () => {
        const provider = new TurtleAutoDefinePrefixProvider(['turtle']);
        provider.dispose();
        expect(() => provider.dispose()).not.toThrow();
    });

    describe('_onDidChangeTextDocument', () => {
        it('sets pending prefix when a colon is typed and autoDefinePrefixes is on', () => {
            mockGetConfig.mockReturnValue({ get: (k: string, d?: any) => k === 'prefixes.autoDefinePrefixes' ? true : d });
            const provider = new TurtleAutoDefinePrefixProvider(['turtle']);

            (provider as any)._onDidChangeTextDocument({
                document: { languageId: 'turtle', uri: { toString: () => 'file:///test.ttl' }, getText: () => 'x' },
                contentChanges: [{ text: 'ex:', range: { start: { line: 0, character: 3 } } }],
            });

            expect((provider as any)._pendingPrefix).toBeDefined();
            expect((provider as any)._pendingPrefix.documentUri).toBe('file:///test.ttl');
        });

        it('stores the correct cursor position', () => {
            mockGetConfig.mockReturnValue({ get: (k: string, d?: any) => k === 'prefixes.autoDefinePrefixes' ? true : d });
            const provider = new TurtleAutoDefinePrefixProvider(['turtle']);
            const position = { line: 5, character: 10 };

            (provider as any)._onDidChangeTextDocument({
                document: { languageId: 'turtle', uri: { toString: () => 'file:///test.ttl' }, getText: () => 'x' },
                contentChanges: [{ text: 'ex:', range: { start: position } }],
            });

            expect((provider as any)._pendingPrefix?.position).toEqual(position);
        });

        it('does not set pending prefix when change text does not end with colon', () => {
            mockGetConfig.mockReturnValue({ get: (k: string, d?: any) => k === 'prefixes.autoDefinePrefixes' ? true : d });
            const provider = new TurtleAutoDefinePrefixProvider(['turtle']);

            (provider as any)._onDidChangeTextDocument({
                document: { languageId: 'turtle', uri: { toString: () => 'file:///test.ttl' }, getText: () => 'x' },
                contentChanges: [{ text: 'ex', range: { start: { line: 0, character: 0 } } }],
            });

            expect((provider as any)._pendingPrefix).toBeUndefined();
        });

        it('does not set pending prefix when autoDefinePrefixes config is disabled', () => {
            mockGetConfig.mockReturnValue({ get: (_k: string, d?: any) => d });
            const provider = new TurtleAutoDefinePrefixProvider(['turtle']);

            (provider as any)._onDidChangeTextDocument({
                document: { languageId: 'turtle', uri: { toString: () => 'file:///test.ttl' }, getText: () => 'x' },
                contentChanges: [{ text: 'ex:', range: { start: { line: 0, character: 0 } } }],
            });

            expect((provider as any)._pendingPrefix).toBeUndefined();
        });

        it('does not set pending prefix when there are no content changes', () => {
            mockGetConfig.mockReturnValue({ get: (k: string, d?: any) => k === 'prefixes.autoDefinePrefixes' ? true : d });
            const provider = new TurtleAutoDefinePrefixProvider(['turtle']);

            (provider as any)._onDidChangeTextDocument({
                document: { languageId: 'turtle', uri: { toString: () => 'file:///test.ttl' }, getText: () => 'x' },
                contentChanges: [],
            });

            expect((provider as any)._pendingPrefix).toBeUndefined();
        });
    });

    describe('triplate frontmatter prefixes', () => {
        // SPARQL template: line 3 holds an example pname value `  type: schema:`.
        const TEXT = '---\nparams { type: iri }\nexample x {\n  type: schema:\n}\n---\nSELECT 1';

        function makeTemplateDoc(): any {
            const lines = TEXT.split('\n');
            return {
                languageId: 'sparql',
                uri: { toString: () => 'file:///q.sparql' },
                getText: () => TEXT,
                offsetAt: (pos: any) => {
                    let off = 0;
                    for (let i = 0; i < pos.line; i++) off += lines[i].length + 1;
                    return off + pos.character;
                },
                lineAt: (line: number) => ({ text: lines[line] ?? '' }),
            };
        }

        it('auto-defines a prefix for a pname example value and reports it as handled', async () => {
            mockGetContext.mockReturnValue({ namespaces: {} });
            mockImplementPrefixes.mockResolvedValue({ size: 1 });

            const provider = new TurtleAutoDefinePrefixProvider(['sparql']);
            const doc = makeTemplateDoc();

            // The second colon on line 3 (`  type: schema:`) is at character 14.
            const handled = (provider as any)._tryAutoDefineFrontmatterPrefix(doc, { line: 3, character: 14 });

            expect(handled).toBe(true);
            await Promise.resolve();
            await Promise.resolve();
            expect(mockImplementPrefixes).toHaveBeenCalledWith(doc, [{ prefix: 'schema', namespaceIri: undefined }]);
        });

        it('does not define a prefix for the binding colon', async () => {
            mockGetContext.mockReturnValue({ namespaces: {} });

            const provider = new TurtleAutoDefinePrefixProvider(['sparql']);
            const doc = makeTemplateDoc();

            // The first colon on line 3 (`  type:`) is at character 6 — the binding, not a pname.
            const handled = (provider as any)._tryAutoDefineFrontmatterPrefix(doc, { line: 3, character: 6 });

            expect(handled).toBe(true);
            await Promise.resolve();
            expect(mockImplementPrefixes).not.toHaveBeenCalled();
        });

        it('does not define an already-declared prefix', async () => {
            mockGetContext.mockReturnValue({ namespaces: { schema: 'http://schema.org/' } });

            const provider = new TurtleAutoDefinePrefixProvider(['sparql']);
            const doc = makeTemplateDoc();

            (provider as any)._tryAutoDefineFrontmatterPrefix(doc, { line: 3, character: 14 });

            await Promise.resolve();
            await Promise.resolve();
            expect(mockImplementPrefixes).not.toHaveBeenCalled();
        });

        it('is not handled when the colon is outside the frontmatter', () => {
            const provider = new TurtleAutoDefinePrefixProvider(['sparql']);
            const doc = makeTemplateDoc();

            // Line 6 is `SELECT 1`, in the body.
            const handled = (provider as any)._tryAutoDefineFrontmatterPrefix(doc, { line: 6, character: 0 });

            expect(handled).toBe(false);
        });

        it('does not set a pending (token-based) prefix for frontmatter pnames', () => {
            mockGetConfig.mockReturnValue({ get: (k: string, d?: any) => k === 'prefixes.autoDefinePrefixes' ? true : d });
            mockGetContext.mockReturnValue({ namespaces: {} });
            mockImplementPrefixes.mockResolvedValue({ size: 1 });

            const provider = new TurtleAutoDefinePrefixProvider(['sparql']);
            const doc = makeTemplateDoc();

            (provider as any)._onDidChangeTextDocument({
                document: doc,
                contentChanges: [{ text: ':', range: { start: { line: 3, character: 14 } } }],
            });

            expect((provider as any)._pendingPrefix).toBeUndefined();
        });
    });

    describe('_onDidChangeDocumentContext', () => {
        it('does nothing when there is no pending prefix', async () => {
            const provider = new TurtleAutoDefinePrefixProvider(['turtle']);
            await (provider as any)._onDidChangeDocumentContext('file:///test.ttl');
            expect(mockGetContext).not.toHaveBeenCalled();
        });

        it('does nothing when pending URI does not match incoming URI', async () => {
            const provider = new TurtleAutoDefinePrefixProvider(['turtle']);
            (provider as any)._pendingPrefix = { documentUri: 'file:///other.ttl', position: { line: 0, character: 0 } };
            await (provider as any)._onDidChangeDocumentContext('file:///test.ttl');
            expect(mockGetContext).not.toHaveBeenCalled();
            // Pending prefix must remain intact (guard bailed early)
            expect((provider as any)._pendingPrefix).toBeDefined();
        });

        it('clears pending prefix and returns when document is not in workspace', async () => {
            const provider = new TurtleAutoDefinePrefixProvider(['turtle']);
            (provider as any)._pendingPrefix = { documentUri: 'file:///test.ttl', position: { line: 0, character: 0 } };
            // textDocuments is empty
            await (provider as any)._onDidChangeDocumentContext('file:///test.ttl');
            expect((provider as any)._pendingPrefix).toBeUndefined();
            expect(mockGetContext).not.toHaveBeenCalled();
        });

        it('returns when context is null', async () => {
            const doc = makeDoc('file:///test.ttl');
            (vscode.workspace.textDocuments as any[]).push(doc);
            mockGetContext.mockReturnValue(null);

            const provider = new TurtleAutoDefinePrefixProvider(['turtle']);
            (provider as any)._pendingPrefix = { documentUri: 'file:///test.ttl', position: { line: 0, character: 0 } };

            await (provider as any)._onDidChangeDocumentContext('file:///test.ttl');
            expect(mockImplementPrefixes).not.toHaveBeenCalled();
        });

        it('returns when token index is less than 1', async () => {
            const doc = makeDoc('file:///test.ttl');
            (vscode.workspace.textDocuments as any[]).push(doc);
            mockGetContext.mockReturnValue(makeContext(0, []));

            const provider = new TurtleAutoDefinePrefixProvider(['turtle']);
            (provider as any)._pendingPrefix = { documentUri: 'file:///test.ttl', position: { line: 0, character: 0 } };

            await (provider as any)._onDidChangeDocumentContext('file:///test.ttl');
            expect(mockImplementPrefixes).not.toHaveBeenCalled();
        });

        it('returns when previous token image is @prefix', async () => {
            const doc = makeDoc('file:///test.ttl');
            (vscode.workspace.textDocuments as any[]).push(doc);
            mockGetContext.mockReturnValue(makeContext(1, [
                { tokenType: { name: 'TTL_PREFIX' }, image: '@prefix' },
                { tokenType: { name: PNAME_NS }, image: 'ex:' },
            ]));

            const provider = new TurtleAutoDefinePrefixProvider(['turtle']);
            (provider as any)._pendingPrefix = { documentUri: 'file:///test.ttl', position: { line: 0, character: 8 } };

            await (provider as any)._onDidChangeDocumentContext('file:///test.ttl');
            expect(mockImplementPrefixes).not.toHaveBeenCalled();
        });

        it('returns when previous token image is PREFIX (SPARQL-style)', async () => {
            const doc = makeDoc('file:///test.ttl');
            (vscode.workspace.textDocuments as any[]).push(doc);
            mockGetContext.mockReturnValue(makeContext(1, [
                { tokenType: { name: 'PREFIX' }, image: 'PREFIX' },
                { tokenType: { name: PNAME_NS }, image: 'ex:' },
            ]));

            const provider = new TurtleAutoDefinePrefixProvider(['turtle']);
            (provider as any)._pendingPrefix = { documentUri: 'file:///test.ttl', position: { line: 0, character: 7 } };

            await (provider as any)._onDidChangeDocumentContext('file:///test.ttl');
            expect(mockImplementPrefixes).not.toHaveBeenCalled();
        });

        it('returns when previous token image is < (URI scheme typed)', async () => {
            const doc = makeDoc('file:///test.ttl');
            (vscode.workspace.textDocuments as any[]).push(doc);
            mockGetContext.mockReturnValue(makeContext(1, [
                { tokenType: { name: 'IRIREF' }, image: '<' },
                { tokenType: { name: PNAME_NS }, image: 'https:' },
            ]));

            const provider = new TurtleAutoDefinePrefixProvider(['turtle']);
            (provider as any)._pendingPrefix = { documentUri: 'file:///test.ttl', position: { line: 0, character: 2 } };

            await (provider as any)._onDidChangeDocumentContext('file:///test.ttl');
            expect(mockImplementPrefixes).not.toHaveBeenCalled();
        });

        it('returns when the prefix is already defined in the document context', async () => {
            const doc = makeDoc('file:///test.ttl');
            (vscode.workspace.textDocuments as any[]).push(doc);
            mockGetContext.mockReturnValue(makeContext(1, [
                { tokenType: { name: 'PERIOD' }, image: '.' },
                { tokenType: { name: PNAME_NS }, image: 'ex:' },
            ], { ex: 'http://example.org/' }));

            const provider = new TurtleAutoDefinePrefixProvider(['turtle']);
            (provider as any)._pendingPrefix = { documentUri: 'file:///test.ttl', position: { line: 0, character: 2 } };

            await (provider as any)._onDidChangeDocumentContext('file:///test.ttl');
            expect(mockImplementPrefixes).not.toHaveBeenCalled();
        });

        it('calls implementPrefixes for an undefined PNAME_NS token', async () => {
            const doc = makeDoc('file:///test.ttl');
            (vscode.workspace.textDocuments as any[]).push(doc);
            mockGetContext.mockReturnValue(makeContext(1, [
                { tokenType: { name: 'PERIOD' }, image: '.' },
                { tokenType: { name: PNAME_NS }, image: 'owl:' },
            ], {}));
            mockImplementPrefixes.mockResolvedValue({ size: 1 });

            const provider = new TurtleAutoDefinePrefixProvider(['turtle']);
            (provider as any)._pendingPrefix = { documentUri: 'file:///test.ttl', position: { line: 0, character: 1 } };

            await (provider as any)._onDidChangeDocumentContext('file:///test.ttl');

            expect(mockImplementPrefixes).toHaveBeenCalledWith(doc, [{ prefix: 'owl', namespaceIri: undefined }]);
        });

        it('does not call applyEdit when implementPrefixes returns size 0', async () => {
            const doc = makeDoc('file:///test.ttl');
            (vscode.workspace.textDocuments as any[]).push(doc);
            mockGetContext.mockReturnValue(makeContext(1, [
                { tokenType: { name: 'PERIOD' }, image: '.' },
                { tokenType: { name: PNAME_NS }, image: 'owl:' },
            ], {}));
            mockImplementPrefixes.mockResolvedValue({ size: 0 });

            const applyEditSpy = vi.spyOn(vscode.workspace, 'applyEdit');
            const provider = new TurtleAutoDefinePrefixProvider(['turtle']);
            (provider as any)._pendingPrefix = { documentUri: 'file:///test.ttl', position: { line: 0, character: 1 } };

            await (provider as any)._onDidChangeDocumentContext('file:///test.ttl');

            expect(applyEditSpy).not.toHaveBeenCalled();
        });

        it('calls applyEdit when implementPrefixes returns size > 0', async () => {
            const doc = makeDoc('file:///test.ttl');
            (vscode.workspace.textDocuments as any[]).push(doc);
            mockGetContext.mockReturnValue(makeContext(1, [
                { tokenType: { name: 'PERIOD' }, image: '.' },
                { tokenType: { name: PNAME_NS }, image: 'owl:' },
            ], {}));
            const fakeEdit = { size: 1 };
            mockImplementPrefixes.mockResolvedValue(fakeEdit);

            const applyEditSpy = vi.spyOn(vscode.workspace, 'applyEdit');
            const provider = new TurtleAutoDefinePrefixProvider(['turtle']);
            (provider as any)._pendingPrefix = { documentUri: 'file:///test.ttl', position: { line: 0, character: 1 } };

            await (provider as any)._onDidChangeDocumentContext('file:///test.ttl');

            expect(applyEditSpy).toHaveBeenCalledWith(fakeEdit);
        });
    });

    describe('onDidChangeTextDocument constructor callback', () => {
        it('ignores documents with non-matching language (early return)', () => {
            let capturedHandler: ((e: any) => void) | undefined;
            vi.spyOn(vscode.workspace, 'onDidChangeTextDocument').mockImplementation((handler: any) => {
                capturedHandler = handler;
                return { dispose: vi.fn() } as any;
            });

            const onChangeSpy = vi.fn();
            const provider = new TurtleAutoDefinePrefixProvider(['turtle']);
            vi.spyOn(provider as any, '_onDidChangeTextDocument').mockImplementation(onChangeSpy);

            // Fire with a non-turtle language — filter doesn't match → early return
            capturedHandler!({ document: { languageId: 'sparql' } });
            expect(onChangeSpy).not.toHaveBeenCalled();
        });

        it('calls _onDidChangeTextDocument for documents with matching language', () => {
            let capturedHandler: ((e: any) => void) | undefined;
            vi.spyOn(vscode.workspace, 'onDidChangeTextDocument').mockImplementation((handler: any) => {
                capturedHandler = handler;
                return { dispose: vi.fn() } as any;
            });

            const onChangeSpy = vi.fn();
            const provider = new TurtleAutoDefinePrefixProvider(['turtle']);
            vi.spyOn(provider as any, '_onDidChangeTextDocument').mockImplementation(onChangeSpy);

            const event = { document: { languageId: 'turtle' } };
            capturedHandler!(event);
            expect(onChangeSpy).toHaveBeenCalledWith(event);
        });
    });

    describe('onDidChangeDocumentContext constructor callback', () => {
        it('calls _onDidChangeDocumentContext when context is truthy', async () => {
            let capturedCtxHandler: ((ctx: any) => void) | undefined;
            mockContextService.onDidChangeDocumentContext.mockImplementation((handler: any) => {
                capturedCtxHandler = handler;
                return { dispose: vi.fn() };
            });

            const onCtxChangeSpy = vi.fn();
            const provider = new TurtleAutoDefinePrefixProvider(['turtle']);
            vi.spyOn(provider as any, '_onDidChangeDocumentContext').mockImplementation(onCtxChangeSpy);

            const ctx = { uri: { toString: () => 'file:///test.ttl' } };
            capturedCtxHandler!(ctx);
            expect(onCtxChangeSpy).toHaveBeenCalledWith('file:///test.ttl');
        });

        it('does not call _onDidChangeDocumentContext when context is null', () => {
            let capturedCtxHandler: ((ctx: any) => void) | undefined;
            mockContextService.onDidChangeDocumentContext.mockImplementation((handler: any) => {
                capturedCtxHandler = handler;
                return { dispose: vi.fn() };
            });

            const onCtxChangeSpy = vi.fn();
            const provider = new TurtleAutoDefinePrefixProvider(['turtle']);
            vi.spyOn(provider as any, '_onDidChangeDocumentContext').mockImplementation(onCtxChangeSpy);

            capturedCtxHandler!(null);
            expect(onCtxChangeSpy).not.toHaveBeenCalled();
        });
    });
});
