import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as vscode from 'vscode';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

const { mockGetConfig, mockGetContextFromUri, mockImplementPrefixes, mockContextService } = vi.hoisted(() => {
    const mockGetContextFromUri = vi.fn(() => null as any);
    const mockImplementPrefixes = vi.fn(async () => ({ size: 0 }));
    const mockContextService = {
        getContextFromUri: mockGetContextFromUri,
        contexts: {},
    };
    const mockGetConfig = vi.fn(() => ({ get: (_k: string, d?: any) => d }));
    return { mockGetConfig, mockGetContextFromUri, mockImplementPrefixes, mockContextService };
});

vi.mock('@src/utilities/vscode/config', () => ({
    getConfig: mockGetConfig,
}));

vi.mock('tsyringe', () => ({
    container: {
        resolve: vi.fn((token: string) => {
            if (token === 'DocumentContextService') return mockContextService;
            return {};
        }),
    },
    injectable: () => (target: any) => target,
    inject: () => (_target: any, _key: any, _index: any) => {},
    singleton: () => (target: any) => target,
}));

import { TurtleAutoDefinePrefixProvider } from '@src/languages/turtle/providers/turtle-auto-define-prefix-provider';

const PNAME_NS = 'PNAME_NS';

// The injected prefix-definition service is mocked down to the one method the provider uses.
const prefixService = { implementPrefixes: mockImplementPrefixes } as any;

function makeProvider(languages: string[] = ['turtle']) {
    return new TurtleAutoDefinePrefixProvider(languages, prefixService, mockContextService as any);
}

/**
 * Creates a single-line token with correct 1-based chevrotain positions so the real
 * `getTokenIndexAtPosition` utility resolves it from a 0-based editor position.
 */
function tok(name: string, image: string, startColumn: number) {
    return { tokenType: { name }, image, startLine: 1, endLine: 1, startColumn, endColumn: startColumn + image.length - 1 };
}

/**
 * Creates a tokenized context whose `tokenize` returns the given tokens.
 */
function makeContext(tokens: any[], namespaces: Record<string, string> = {}, providesTokens = true): any {
    return {
        providesTokens,
        namespaces,
        tokenize: vi.fn(() => tokens),
    };
}

beforeEach(() => {
    vi.clearAllMocks();
    mockGetConfig.mockReturnValue({ get: (_k: string, d?: any) => d });
    mockGetContextFromUri.mockReturnValue(null);
    mockImplementPrefixes.mockResolvedValue({ size: 0 });
});

afterEach(() => {
    (vscode.workspace.textDocuments as any[]).length = 0;
});

describe('TurtleAutoDefinePrefixProvider', () => {
    it('constructs without throwing', () => {
        expect(() => makeProvider(['turtle'])).not.toThrow();
    });

    it('accepts an empty language list', () => {
        expect(() => makeProvider([])).not.toThrow();
    });

    it('dispose() can be called multiple times without throwing', () => {
        const provider = makeProvider(['turtle']);
        provider.dispose();
        expect(() => provider.dispose()).not.toThrow();
    });

    describe('_onDidChangeTextDocument gating', () => {
        function fire(provider: any, text: string) {
            provider._onDidChangeTextDocument({
                document: { languageId: 'turtle', uri: { toString: () => 'file:///test.ttl' }, getText: () => 'x' },
                contentChanges: [{ text, range: { start: { line: 0, character: 0 } } }],
            });
        }

        it('ignores changes that do not end with a colon', () => {
            mockGetConfig.mockReturnValue({ get: (k: string, d?: any) => k === 'prefixes.autoDefinePrefixes' ? true : d });
            fire(makeProvider(), 'ex');
            expect(mockGetContextFromUri).not.toHaveBeenCalled();
        });

        it('does nothing when autoDefinePrefixes is disabled', () => {
            mockGetConfig.mockReturnValue({ get: (_k: string, d?: any) => d });
            fire(makeProvider(), 'ex:');
            expect(mockGetContextFromUri).not.toHaveBeenCalled();
        });

        it('does nothing when there are no content changes', () => {
            mockGetConfig.mockReturnValue({ get: (k: string, d?: any) => k === 'prefixes.autoDefinePrefixes' ? true : d });
            (makeProvider() as any)._onDidChangeTextDocument({
                document: { languageId: 'turtle', uri: { toString: () => 'file:///test.ttl' }, getText: () => 'x' },
                contentChanges: [],
            });
            expect(mockGetContextFromUri).not.toHaveBeenCalled();
        });
    });

    describe('_tryAutoDefineBodyPrefix', () => {
        const doc: any = { uri: { toString: () => 'file:///test.ttl' }, languageId: 'turtle', getText: () => '. ex:' };
        const colon = { line: 0, character: 4 };

        it('returns when there is no context', async () => {
            mockGetContextFromUri.mockReturnValue(null);
            await (makeProvider() as any)._tryAutoDefineBodyPrefix(doc, colon);
            expect(mockImplementPrefixes).not.toHaveBeenCalled();
        });

        it('returns when the context is not tokenized', async () => {
            mockGetContextFromUri.mockReturnValue(makeContext([], {}, false));
            await (makeProvider() as any)._tryAutoDefineBodyPrefix(doc, colon);
            expect(mockImplementPrefixes).not.toHaveBeenCalled();
        });

        it('returns when no token is found at the position', async () => {
            mockGetContextFromUri.mockReturnValue(makeContext([]));
            await (makeProvider() as any)._tryAutoDefineBodyPrefix(doc, colon);
            expect(mockImplementPrefixes).not.toHaveBeenCalled();
        });

        it('implements a prefix when the PNAME_NS is the first token in the document', async () => {
            mockGetContextFromUri.mockReturnValue(makeContext([
                tok(PNAME_NS, 'ex:', 1),
            ], {}));
            mockImplementPrefixes.mockResolvedValue({ size: 1 });

            // The colon of `ex:` is at 1-based column 3 → 0-based character 2.
            await (makeProvider() as any)._tryAutoDefineBodyPrefix(doc, { line: 0, character: 2 });

            expect(mockImplementPrefixes).toHaveBeenCalledWith(doc, [{ prefix: 'ex', namespaceIri: undefined }]);
        });

        it('returns when the previous token is @prefix', async () => {
            mockGetContextFromUri.mockReturnValue(makeContext([
                tok('TTL_PREFIX', '@prefix', 1),
                tok(PNAME_NS, 'ex:', 9),
            ]));
            await (makeProvider() as any)._tryAutoDefineBodyPrefix(doc, { line: 0, character: 10 });
            expect(mockImplementPrefixes).not.toHaveBeenCalled();
        });

        it('returns when the previous token is PREFIX (SPARQL-style)', async () => {
            mockGetContextFromUri.mockReturnValue(makeContext([
                tok('PREFIX', 'PREFIX', 1),
                tok(PNAME_NS, 'ex:', 8),
            ]));
            await (makeProvider() as any)._tryAutoDefineBodyPrefix(doc, { line: 0, character: 9 });
            expect(mockImplementPrefixes).not.toHaveBeenCalled();
        });

        it('returns when the previous token is < (URI scheme typed)', async () => {
            mockGetContextFromUri.mockReturnValue(makeContext([
                tok('IRIREF', '<', 1),
                tok(PNAME_NS, 'https:', 2),
            ]));
            await (makeProvider() as any)._tryAutoDefineBodyPrefix(doc, { line: 0, character: 6 });
            expect(mockImplementPrefixes).not.toHaveBeenCalled();
        });

        it('returns when the prefix is already defined', async () => {
            mockGetContextFromUri.mockReturnValue(makeContext([
                tok('PERIOD', '.', 1),
                tok(PNAME_NS, 'ex:', 3),
            ], { ex: 'http://example.org/' }));
            await (makeProvider() as any)._tryAutoDefineBodyPrefix(doc, colon);
            expect(mockImplementPrefixes).not.toHaveBeenCalled();
        });

        it('implements an undefined PNAME_NS prefix', async () => {
            mockGetContextFromUri.mockReturnValue(makeContext([
                tok('PERIOD', '.', 1),
                tok(PNAME_NS, 'owl:', 3),
            ], {}));
            mockImplementPrefixes.mockResolvedValue({ size: 1 });

            await (makeProvider() as any)._tryAutoDefineBodyPrefix(doc, { line: 0, character: 5 });

            expect(mockImplementPrefixes).toHaveBeenCalledWith(doc, [{ prefix: 'owl', namespaceIri: undefined }]);
        });

        it('does not applyEdit when the edit is empty', async () => {
            mockGetContextFromUri.mockReturnValue(makeContext([
                tok('PERIOD', '.', 1),
                tok(PNAME_NS, 'owl:', 3),
            ], {}));
            mockImplementPrefixes.mockResolvedValue({ size: 0 });
            const applyEditSpy = vi.spyOn(vscode.workspace, 'applyEdit');

            await (makeProvider() as any)._tryAutoDefineBodyPrefix(doc, { line: 0, character: 5 });

            expect(applyEditSpy).not.toHaveBeenCalled();
        });

        it('applies the edit when the edit is non-empty', async () => {
            mockGetContextFromUri.mockReturnValue(makeContext([
                tok('PERIOD', '.', 1),
                tok(PNAME_NS, 'owl:', 3),
            ], {}));
            const fakeEdit = { size: 1 };
            mockImplementPrefixes.mockResolvedValue(fakeEdit);
            const applyEditSpy = vi.spyOn(vscode.workspace, 'applyEdit');

            await (makeProvider() as any)._tryAutoDefineBodyPrefix(doc, { line: 0, character: 5 });

            expect(applyEditSpy).toHaveBeenCalledWith(fakeEdit);
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
            mockGetContextFromUri.mockReturnValue({ namespaces: {} });
            mockImplementPrefixes.mockResolvedValue({ size: 1 });

            const provider = makeProvider(['sparql']);
            const doc = makeTemplateDoc();

            // The second colon on line 3 (`  type: schema:`) is at character 14.
            const handled = (provider as any)._tryAutoDefineFrontmatterPrefix(doc, { line: 3, character: 14 });

            expect(handled).toBe(true);
            await Promise.resolve();
            await Promise.resolve();
            expect(mockImplementPrefixes).toHaveBeenCalledWith(doc, [{ prefix: 'schema', namespaceIri: undefined }]);
        });

        it('does not define a prefix for the binding colon', async () => {
            mockGetContextFromUri.mockReturnValue({ namespaces: {} });

            const provider = makeProvider(['sparql']);
            const doc = makeTemplateDoc();

            // The first colon on line 3 (`  type:`) is at character 6 — the binding, not a pname.
            const handled = (provider as any)._tryAutoDefineFrontmatterPrefix(doc, { line: 3, character: 6 });

            expect(handled).toBe(true);
            await Promise.resolve();
            expect(mockImplementPrefixes).not.toHaveBeenCalled();
        });

        it('does not define an already-declared prefix', async () => {
            mockGetContextFromUri.mockReturnValue({ namespaces: { schema: 'http://schema.org/' } });

            const provider = makeProvider(['sparql']);
            const doc = makeTemplateDoc();

            (provider as any)._tryAutoDefineFrontmatterPrefix(doc, { line: 3, character: 14 });

            await Promise.resolve();
            await Promise.resolve();
            expect(mockImplementPrefixes).not.toHaveBeenCalled();
        });

        it('is not handled when the colon is outside the frontmatter', () => {
            const provider = makeProvider(['sparql']);
            const doc = makeTemplateDoc();

            // Line 6 is `SELECT 1`, in the body.
            const handled = (provider as any)._tryAutoDefineFrontmatterPrefix(doc, { line: 6, character: 0 });

            expect(handled).toBe(false);
        });
    });

    describe('onDidChangeTextDocument constructor callback', () => {
        it('ignores documents with non-matching language (early return)', () => {
            let capturedHandler: ((e: any) => void) | undefined;
            vi.spyOn(vscode.workspace, 'onDidChangeTextDocument').mockImplementation((handler: any) => {
                capturedHandler = handler;
                return { dispose: vi.fn() } as any;
            });

            const provider = makeProvider(['turtle']);
            const onChangeSpy = vi.fn();
            vi.spyOn(provider as any, '_onDidChangeTextDocument').mockImplementation(onChangeSpy);

            capturedHandler!({ document: { languageId: 'sparql' } });
            expect(onChangeSpy).not.toHaveBeenCalled();
        });

        it('calls _onDidChangeTextDocument for documents with matching language', () => {
            let capturedHandler: ((e: any) => void) | undefined;
            vi.spyOn(vscode.workspace, 'onDidChangeTextDocument').mockImplementation((handler: any) => {
                capturedHandler = handler;
                return { dispose: vi.fn() } as any;
            });

            const provider = makeProvider(['turtle']);
            const onChangeSpy = vi.fn();
            vi.spyOn(provider as any, '_onDidChangeTextDocument').mockImplementation(onChangeSpy);

            const event = { document: { languageId: 'turtle' } };
            capturedHandler!(event);
            expect(onChangeSpy).toHaveBeenCalledWith(event);
        });
    });
});
