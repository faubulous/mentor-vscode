import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RdfToken } from '@faubulous/mentor-rdf-parsers';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

vi.mock('tsyringe', () => ({
    container: { resolve: vi.fn(() => ({})) },
    injectable: () => (_target: any) => _target,
    inject: () => () => {},
    singleton: () => (_target: any) => _target,
}));

import { Uri, Position } from '@src/utilities/mocks/vscode';
import { TurtleCompletionItemProvider } from '@src/languages/turtle/providers/turtle-completion-item-provider';
import { TurtleDocument } from '@src/languages/turtle/turtle-document';
import { RdfSyntax } from '@faubulous/mentor-rdf-parsers';

function makeDoc(uri = 'file:///w/test.ttl'): TurtleDocument {
    return new TurtleDocument(Uri.parse(uri) as any, RdfSyntax.Turtle);
}

function makeToken(name: string, image: string, opts: {
    startLine?: number; startColumn?: number;
    endLine?: number; endColumn?: number;
} = {}) {
    return {
        tokenType: { name },
        image,
        startLine: opts.startLine ?? 1,
        startColumn: opts.startColumn ?? 1,
        endLine: opts.endLine ?? 1,
        endColumn: opts.endColumn ?? (opts.startColumn ?? 1) + image.length - 1,
    };
}

function makeProvider(): TurtleCompletionItemProvider {
    const provider = new TurtleCompletionItemProvider();

    vi.spyOn(provider as any, 'contextService', 'get').mockReturnValue({
        getDocumentContext: () => null,
        getDocumentContextFromUri: () => null,
        contexts: {},
    });
    vi.spyOn(provider as any, 'vocabulary', 'get').mockReturnValue({
        getProperties: () => [],
        getClasses: () => [],
    });

    return provider;
}

// Build a mock context object from loose parts (faster than full TurtleDocument parsing)
function makeMockContext(tokens: any[], namespaces: Record<string, string> = {}, subjects: Record<string, any> = {}): any {
    return {
        tokens,
        namespaces,
        subjects,
        getTokenIndexAtPosition: vi.fn(() => tokens.length - 1),
        getResourceDescription: vi.fn(() => undefined),
    };
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe('TurtleCompletionItemProvider', () => {
    describe('constructor', () => {
        it('can be instantiated without throwing', () => {
            expect(() => new TurtleCompletionItemProvider()).not.toThrow();
        });
    });

    describe('maxCompletionItems', () => {
        it('is a positive integer', () => {
            const provider = makeProvider();
            expect(provider.maxCompletionItems).toBeGreaterThan(0);
        });
    });

    describe('provideCompletionItems', () => {
        it('returns null when context is not available for the document', () => {
            const provider = makeProvider();
            const doc = { uri: Uri.parse('file:///w/test.ttl'), languageId: 'turtle' };
            const result = provider.provideCompletionItems(doc as any, new Position(0, 5) as any, {} as any, {} as any);
            expect(result).toBeNull();
        });

        it('returns null when token index is less than 1', () => {
            const provider = makeProvider();
            const mockCtx = makeMockContext([makeToken(RdfToken.PNAME_LN.name, 'ex:F')]);
            mockCtx.getTokenIndexAtPosition.mockReturnValue(0);

            vi.spyOn(provider as any, 'contextService', 'get').mockReturnValue({
                getDocumentContext: () => mockCtx,
                getDocumentContextFromUri: () => null,
                contexts: {},
            });

            const doc = { uri: Uri.parse('file:///w/test.ttl') };
            const result = provider.provideCompletionItems(doc as any, new Position(0, 0) as any, {} as any, {} as any);
            expect(result).toBeNull();
        });

        it('returns completion items array when token index >= 1', () => {
            const provider = makeProvider();
            const tokens = [
                makeToken(RdfToken.PERIOD.name, '.'),
                makeToken(RdfToken.PNAME_LN.name, 'ex:F'),
            ];
            const mockCtx = makeMockContext(tokens, {});
            mockCtx.getTokenIndexAtPosition.mockReturnValue(1);

            vi.spyOn(provider as any, 'contextService', 'get').mockReturnValue({
                getDocumentContext: () => mockCtx,
                getDocumentContextFromUri: () => null,
                contexts: {},
            });

            const doc = { uri: Uri.parse('file:///w/test.ttl') };
            const result = provider.provideCompletionItems(doc as any, new Position(0, 3) as any, {} as any, {} as any);
            expect(Array.isArray(result)).toBe(true);
        });
    });

    describe('resolveCompletionItem', () => {
        it('returns the item unchanged', () => {
            const provider = makeProvider();
            const item = { label: 'ex:Thing', kind: 5 };
            const result = provider.resolveCompletionItem!(item as any, {} as any);
            expect(result).toBe(item);
        });
    });

    describe('getCompletionItems', () => {
        it('returns empty array when the current token is IRIREF (not PNAME_LN or PNAME_NS)', () => {
            const provider = makeProvider();
            const context = makeDoc();
            const tokens = [
                makeToken(RdfToken.IRIREF.name, '<http://example.org/>', { startLine: 1, startColumn: 1, endColumn: 21 }),
                makeToken(RdfToken.PERIOD.name, '.', { startLine: 1, startColumn: 23, endColumn: 23 }),
            ];
            context.setTokens(tokens as any);

            vi.spyOn(provider as any, 'contextService', 'get').mockReturnValue({
                getDocumentContext: () => context,
                getDocumentContextFromUri: () => null,
                contexts: {},
            });

            const doc = { uri: Uri.parse('file:///w/test.ttl') };
            const result = (provider as any).getCompletionItems(doc as any, context, 0);
            expect(result).toEqual([]);
        });

        it('returns empty array when PNAME_LN is used but namespace is not defined', () => {
            const provider = makeProvider();
            const context = makeDoc();
            const tokens = [
                makeToken(RdfToken.PERIOD.name, '.', { startLine: 1, startColumn: 1, endColumn: 1 }),
                makeToken(RdfToken.PNAME_LN.name, 'ex:Foo', { startLine: 1, startColumn: 3, endColumn: 8 }),
            ];
            context.setTokens(tokens as any);

            vi.spyOn(provider as any, 'contextService', 'get').mockReturnValue({
                getDocumentContext: () => context,
                getDocumentContextFromUri: () => null,
                contexts: {},
            });

            const doc = { uri: Uri.parse('file:///w/test.ttl') };
            const result = (provider as any).getCompletionItems(doc as any, context, 1);
            expect(result).toEqual([]);
        });

        it('returns vocabulary property completions for predicate PNAME_LN with defined namespace', () => {
            const provider = makeProvider();

            // Tokens: PERIOD, IRIREF (subject), PNAME_LN (predicate being typed)
            const tokens = [
                makeToken(RdfToken.PERIOD.name, '.', { startLine: 1, startColumn: 1 }),
                makeToken(RdfToken.IRIREF.name, '<http://example.org/Sub>', { startLine: 1, startColumn: 3 }),
                makeToken(RdfToken.PNAME_LN.name, 'ex:n', { startLine: 1, startColumn: 28 }),
            ];
            // previous of index 2 is IRIREF → getTripleComponentType returns "predicate" in a specific case.
            // Using SEMICOLON as previous token is more reliable for predicate:
            const tokens2 = [
                makeToken(RdfToken.IRIREF.name, '<http://example.org/Sub>', { startLine: 1, startColumn: 1 }),
                makeToken(RdfToken.SEMICOLON.name, ';', { startLine: 1, startColumn: 25 }),
                makeToken(RdfToken.PNAME_LN.name, 'ex:n', { startLine: 1, startColumn: 27 }),
            ];
            // context.namespaces needs to have 'ex' defined
            const mockCtx = makeMockContext(tokens2, { ex: 'http://example.org/' });
            const mockVocab = {
                getProperties: vi.fn(() => ['http://example.org/name', 'http://example.org/other']),
            };

            vi.spyOn(provider as any, 'contextService', 'get').mockReturnValue({
                getDocumentContext: () => mockCtx,
                getDocumentContextFromUri: vi.fn(() => null),
                contexts: {},
            });
            vi.spyOn(provider as any, 'vocabulary', 'get').mockReturnValue(mockVocab);

            const doc = { uri: Uri.parse('file:///w/test.ttl') };
            const result = (provider as any).getCompletionItems(doc, mockCtx, 2) as any[];

            // 'ex:n' is typed → namespaceIri = 'http://example.org/', localPart = 'n'
            // iri = 'http://example.org/n' (search prefix)
            // property 'http://example.org/name' starts with 'http://example.org/n' → included
            // property 'http://example.org/other' does NOT start with 'http://example.org/n' → excluded
            expect(mockVocab.getProperties).toHaveBeenCalled();
            expect(result.some((item: any) => item.label === 'name')).toBe(true);
        });

        it('returns subject completions for non-predicate PNAME_LN with context subjects', () => {
            const provider = makeProvider();
            const tokens = [
                makeToken(RdfToken.PERIOD.name, '.', { startLine: 1, startColumn: 1 }),
                makeToken(RdfToken.PNAME_LN.name, 'ex:F', { startLine: 1, startColumn: 3 }),
            ];
            const mockCtx = makeMockContext(tokens, { ex: 'http://example.org/' });
            // A sub-context that has a subject matching the prefix
            const subContext = {
                subjects: { 'http://example.org/Foo': true, 'http://example.org/Bar': true },
            };

            vi.spyOn(provider as any, 'contextService', 'get').mockReturnValue({
                getDocumentContext: () => mockCtx,
                getDocumentContextFromUri: vi.fn((uri: string) =>
                    uri === 'mentor:///test.ttl' || uri === 'http://example.org/' ? subContext : null
                ),
                contexts: {},
            });

            const doc = { uri: Uri.parse('file:///w/test.ttl') };
            const result = (provider as any).getCompletionItems(doc, mockCtx, 1) as any[];

            // 'ex:F' → namespaceIri = 'http://example.org/', localPart = 'F'
            // iri = 'http://example.org/f' (lowercase search prefix)
            // 'http://example.org/Foo'.toLowerCase() starts with 'http://example.org/f' → match
            expect(result.some((item: any) => item.label === 'Foo')).toBe(true);
        });

        it('falls back to all contexts when primary context search returns empty', () => {
            const provider = makeProvider();
            const tokens = [
                makeToken(RdfToken.PERIOD.name, '.', { startLine: 1, startColumn: 1 }),
                makeToken(RdfToken.PNAME_LN.name, 'ex:F', { startLine: 1, startColumn: 3 }),
            ];
            const mockCtx = makeMockContext(tokens, { ex: 'http://example.org/' });
            const globalContext = {
                subjects: { 'http://example.org/Fizz': true },
            };

            vi.spyOn(provider as any, 'contextService', 'get').mockReturnValue({
                getDocumentContext: () => mockCtx,
                // Return null for graph-based lookup (no local context for those URIs)
                getDocumentContextFromUri: vi.fn(() => null),
                // But global contexts contain the subject
                contexts: { global: globalContext },
            });

            const doc = { uri: Uri.parse('file:///w/test.ttl') };
            const result = (provider as any).getCompletionItems(doc, mockCtx, 1) as any[];

            // Since graph lookups return null, result[0] empty → falls back to contextService.contexts
            expect(result.some((item: any) => item.label === 'Fizz')).toBe(true);
        });

        it('deduplicates completion items by IRI', () => {
            const provider = makeProvider();
            const tokens = [
                makeToken(RdfToken.PERIOD.name, '.'),
                makeToken(RdfToken.PNAME_LN.name, 'ex:F'),
            ];
            const mockCtx = makeMockContext(tokens, { ex: 'http://example.org/' });
            const ctx1 = { subjects: { 'http://example.org/Foo': true } };
            const ctx2 = { subjects: { 'http://example.org/Foo': true, 'http://example.org/Far': true } };

            let callCount = 0;
            vi.spyOn(provider as any, 'contextService', 'get').mockReturnValue({
                getDocumentContext: () => mockCtx,
                getDocumentContextFromUri: vi.fn(() => {
                    callCount++;
                    return callCount === 1 ? ctx1 : ctx2;
                }),
                contexts: {},
            });

            const doc = { uri: Uri.parse('file:///w/test.ttl') };
            const result = (provider as any).getCompletionItems(doc, mockCtx, 1) as any[];

            const fooItems = result.filter((item: any) => item.label === 'Foo');
            expect(fooItems).toHaveLength(1);
        });

        it('respects maxCompletionItems limit', () => {
            const provider = makeProvider();
            const tokens = [
                makeToken(RdfToken.PERIOD.name, '.'),
                makeToken(RdfToken.PNAME_LN.name, 'ex:'),
            ];
            const mockCtx = makeMockContext(tokens, { ex: 'http://example.org/' });
            // 15 subjects, but max is 10
            const subjects: Record<string, boolean> = {};
            for (let i = 0; i < 15; i++) {
                subjects[`http://example.org/${String.fromCharCode(65 + i)}`] = true;
            }
            vi.spyOn(provider as any, 'contextService', 'get').mockReturnValue({
                getDocumentContext: () => mockCtx,
                getDocumentContextFromUri: vi.fn(() => ({ subjects })),
                contexts: {},
            });

            const doc = { uri: Uri.parse('file:///w/test.ttl') };
            const result = (provider as any).getCompletionItems(doc, mockCtx, 1) as any[];

            expect(result.length).toBeLessThanOrEqual(provider.maxCompletionItems);
        });
    });

    describe('getter bodies', () => {
        it('contextService getter calls container.resolve', () => {
            const provider = new TurtleCompletionItemProvider();
            // No spy — real getter body (line 52) must execute
            const service = (provider as any).contextService;
            expect(service).toBeDefined();
        });

        it('vocabulary getter calls container.resolve', () => {
            const provider = new TurtleCompletionItemProvider();
            // No spy — real getter body (line 56) must execute
            const vocab = (provider as any).vocabulary;
            expect(vocab).toBeDefined();
        });
    });

    describe('_addLocalPartCompletionItem', () => {
        it('returns early without adding item when localPart is empty', () => {
            const provider = new TurtleCompletionItemProvider();
            const result: Record<string, any> = {};
            // IRI ending in '/' has empty local part → triggers the !localPart return
            (provider as any)._addLocalPartCompletionItem(result, 'http://example.org/', 'http://example.org/');
            expect(Object.keys(result)).toHaveLength(0);
        });
    });
});
