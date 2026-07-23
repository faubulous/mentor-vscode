import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RdfToken } from '@faubulous/mentor-rdf-parsers';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

vi.mock('tsyringe', () => ({
    container: { resolve: vi.fn(() => ({})) },
    injectable: () => (_target: any) => _target,
    inject: () => () => {},
    singleton: () => (_target: any) => _target,
}));

import * as vscode from 'vscode';
import { TurtleCompletionItemProvider } from '@src/languages/turtle/providers/turtle-completion-item-provider';
import { TurtleDocument } from '@src/languages/turtle/turtle-document';
import {
    createTurtleDocument,
    createMockDocumentContextService,
    createMockTextDocument,
    createTestVocabulary,
} from '@src/utilities/mocks/factories';

/** Shared invocation arguments for provideCompletionItems/resolveCompletionItem. */
const cancellationToken = new vscode.CancellationTokenSource().token;
const completionContext: vscode.CompletionContext = { triggerKind: vscode.CompletionTriggerKind.Invoke, triggerCharacter: undefined };

function makeDoc(uri = 'file:///w/test.ttl'): TurtleDocument {
    return createTurtleDocument(uri);
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
    const provider = new TurtleCompletionItemProvider(createMockDocumentContextService(), createTestVocabulary());

    (provider as any)._contextService = ({
        getDocumentContext: () => null,
        getDocumentContextFromUri: () => null,
        contexts: {},
    });
    (provider as any)._vocabulary = ({
        getProperties: () => [],
        getClasses: () => [],
        getRange: () => undefined,
        getDatatype: () => undefined,
    });

    return provider;
}

// Build a mock context object from loose parts (faster than full TurtleDocument parsing)
function makeMockContext(tokens: any[], namespaces: Record<string, string> = {}, subjects: Record<string, any> = {}, graphIri: any = 'workspace:///test.ttl'): any {
    return {
        tokens,
        namespaces,
        subjects,
        graphIri,
        tokenize: vi.fn(() => tokens),
        getResourceDescription: vi.fn(() => undefined),
    };
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe('TurtleCompletionItemProvider', () => {
    describe('constructor', () => {
        it('can be instantiated without throwing', () => {
            expect(() => new TurtleCompletionItemProvider(createMockDocumentContextService(), createTestVocabulary())).not.toThrow();
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
            const doc = createMockTextDocument('', { uri: 'file:///w/test.ttl' });
            const result = provider.provideCompletionItems(doc, new vscode.Position(0, 5), cancellationToken, completionContext);
            expect(result).toBeNull();
        });

        it('returns null when token index is less than 1', () => {
            const provider = makeProvider();
            // Position (0,0) sits at the first/only token → index 0 → provider returns null.
            const mockCtx = makeMockContext([makeToken(RdfToken.PNAME_LN.name, 'ex:F')]);

            (provider as any)._contextService = ({
                getDocumentContext: () => mockCtx,
                getDocumentContextFromUri: () => null,
                contexts: {},
            });

            const doc = createMockTextDocument('ex:F', { uri: 'file:///w/test.ttl' });
            const result = provider.provideCompletionItems(doc, new vscode.Position(0, 0), cancellationToken, completionContext);
            expect(result).toBeNull();
        });

        it('returns a completion list when token index >= 1', () => {
            const provider = makeProvider();
            // Position (0,3) sits inside the second token → index 1 → provider proceeds.
            const tokens = [
                makeToken(RdfToken.PERIOD.name, '.', { startColumn: 1, endColumn: 1 }),
                makeToken(RdfToken.PNAME_LN.name, 'ex:F', { startColumn: 2, endColumn: 5 }),
            ];
            const mockCtx = makeMockContext(tokens, {});

            (provider as any)._contextService = ({
                getDocumentContext: () => mockCtx,
                getDocumentContextFromUri: () => null,
                contexts: {},
            });

            const doc = createMockTextDocument('. ex:F', { uri: 'file:///w/test.ttl' });
            const result = provider.provideCompletionItems(doc, new vscode.Position(0, 3), cancellationToken, completionContext) as vscode.CompletionList;
            expect(Array.isArray(result.items)).toBe(true);
        });

        it('tokenizes the current document text instead of using stored tokens', () => {
            const provider = makeProvider();
            const tokens = [
                makeToken(RdfToken.PERIOD.name, '.', { startColumn: 1, endColumn: 1 }),
                makeToken(RdfToken.PNAME_LN.name, 'ex:F', { startColumn: 2, endColumn: 5 }),
            ];
            // The stored tokens are stale/empty — only tokenize() returns the fresh tokens.
            const mockCtx = makeMockContext([], {});
            mockCtx.tokenize = vi.fn(() => tokens);

            (provider as any)._contextService = ({
                getDocumentContext: () => mockCtx,
                getDocumentContextFromUri: () => null,
                contexts: {},
            });

            const doc = createMockTextDocument('. ex:F', { uri: 'file:///w/test.ttl' });
            const result = provider.provideCompletionItems(doc, new vscode.Position(0, 3), cancellationToken, completionContext) as vscode.CompletionList;

            expect(mockCtx.tokenize).toHaveBeenCalledWith('. ex:F');
            expect(Array.isArray(result.items)).toBe(true);
        });
    });

    describe('resolveCompletionItem', () => {
        it('returns the item unchanged', () => {
            const provider = makeProvider();
            const item = new vscode.CompletionItem('ex:Thing', vscode.CompletionItemKind.Variable);
            const result = provider.resolveCompletionItem!(item, cancellationToken);
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

            (provider as any)._contextService = ({
                getDocumentContext: () => context,
                getDocumentContextFromUri: () => null,
                contexts: {},
            });

            const doc = createMockTextDocument('', { uri: 'file:///w/test.ttl' });
            const result = (provider as any).getCompletionItems(doc, context, tokens, 0);
            expect(result.items).toEqual([]);
        });

        it('returns empty array when PNAME_LN is used but namespace is not defined', () => {
            const provider = makeProvider();
            const context = makeDoc();
            const tokens = [
                makeToken(RdfToken.PERIOD.name, '.', { startLine: 1, startColumn: 1, endColumn: 1 }),
                makeToken(RdfToken.PNAME_LN.name, 'ex:Foo', { startLine: 1, startColumn: 3, endColumn: 8 }),
            ];
            context.setTokens(tokens as any);

            (provider as any)._contextService = ({
                getDocumentContext: () => context,
                getDocumentContextFromUri: () => null,
                contexts: {},
            });

            const doc = createMockTextDocument('', { uri: 'file:///w/test.ttl' });
            const result = (provider as any).getCompletionItems(doc, context, tokens, 1);
            expect(result.items).toEqual([]);
        });

        it('returns vocabulary property completions for predicate PNAME_LN with defined namespace', () => {
            const provider = makeProvider();

            // Tokens: PERIOD, IRIREF (subject), PNAME_LN (predicate being typed)
            const _tokens = [
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
                getClasses: () => [],
                getRange: () => undefined,
                getDatatype: () => undefined,
            };

            (provider as any)._contextService = ({
                getDocumentContext: () => mockCtx,
                getDocumentContextFromUri: vi.fn(() => null),
                contexts: {},
            });
            (provider as any)._vocabulary = (mockVocab);

            const doc = createMockTextDocument('', { uri: 'file:///w/test.ttl' });
            const result = (provider as any).getCompletionItems(doc, mockCtx, tokens2, 2).items as any[];

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

            (provider as any)._contextService = ({
                getDocumentContext: () => mockCtx,
                getDocumentContextFromUri: vi.fn((uri: string) =>
                    uri === 'workspace:///test.ttl' || uri === 'http://example.org/' ? subContext : null
                ),
                contexts: {},
            });

            const doc = createMockTextDocument('', { uri: 'file:///w/test.ttl' });
            const result = (provider as any).getCompletionItems(doc, mockCtx, tokens, 1).items as any[];

            // 'ex:F' → namespaceIri = 'http://example.org/', localPart = 'F'
            // iri = 'http://example.org/f' (lowercase search prefix)
            // 'http://example.org/Foo'.toLowerCase() starts with 'http://example.org/f' → match
            expect(result.some((item: any) => item.label === 'Foo')).toBe(true);
        });

        it('returns subject completions for untitled documents where the graph IRI falls back to the document URI', () => {
            const provider = makeProvider();
            const tokens = [
                makeToken(RdfToken.PERIOD.name, '.', { startLine: 1, startColumn: 1 }),
                makeToken(RdfToken.PNAME_LN.name, 'ex:F', { startLine: 1, startColumn: 3 }),
            ];
            // For untitled documents, WorkspaceUri.toWorkspaceUri() returns undefined and the
            // context's graphIri falls back to the document URI itself.
            const mockCtx = makeMockContext(tokens, { ex: 'http://example.org/' }, {}, 'untitled:Untitled-1');
            const subContext = {
                subjects: { 'http://example.org/Foo': true },
            };

            const getDocumentContextFromUri = vi.fn((uri: string) =>
                uri === 'untitled:Untitled-1' ? subContext : null
            );

            (provider as any)._contextService = ({
                getDocumentContext: () => mockCtx,
                getDocumentContextFromUri,
                contexts: {},
            });

            const doc = createMockTextDocument('', { uri: 'untitled:Untitled-1' });
            const result = (provider as any).getCompletionItems(doc, mockCtx, tokens, 1).items as any[];

            // The untitled graph IRI must be queried for local subjects.
            expect(getDocumentContextFromUri).toHaveBeenCalledWith('untitled:Untitled-1');
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

            (provider as any)._contextService = ({
                getDocumentContext: () => mockCtx,
                // Return null for graph-based lookup (no local context for those URIs)
                getDocumentContextFromUri: vi.fn(() => null),
                // But global contexts contain the subject
                contexts: { global: globalContext },
            });

            const doc = createMockTextDocument('', { uri: 'file:///w/test.ttl' });
            const result = (provider as any).getCompletionItems(doc, mockCtx, tokens, 1).items as any[];

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
            (provider as any)._contextService = ({
                getDocumentContext: () => mockCtx,
                getDocumentContextFromUri: vi.fn(() => {
                    callCount++;
                    return callCount === 1 ? ctx1 : ctx2;
                }),
                contexts: {},
            });

            const doc = createMockTextDocument('', { uri: 'file:///w/test.ttl' });
            const result = (provider as any).getCompletionItems(doc, mockCtx, tokens, 1).items as any[];

            const fooItems = result.filter((item: any) => item.label === 'Foo');
            expect(fooItems).toHaveLength(1);
        });

        it('respects maxCompletionItems limit and marks the truncated list as incomplete', () => {
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
            (provider as any)._contextService = ({
                getDocumentContext: () => mockCtx,
                getDocumentContextFromUri: vi.fn(() => ({ subjects })),
                contexts: {},
            });

            const doc = createMockTextDocument('', { uri: 'file:///w/test.ttl' });
            const result = (provider as any).getCompletionItems(doc, mockCtx, tokens, 1);

            expect(result.items.length).toBeLessThanOrEqual(provider.maxCompletionItems);
            // The list must be marked incomplete so that VS Code re-invokes the provider
            // as the user keeps typing; otherwise items beyond the cut-off never appear.
            expect(result.isIncomplete).toBe(true);
        });

        it('does not mark the list as incomplete when all matches are returned', () => {
            const provider = makeProvider();
            const tokens = [
                makeToken(RdfToken.PERIOD.name, '.'),
                makeToken(RdfToken.PNAME_LN.name, 'ex:F'),
            ];
            const mockCtx = makeMockContext(tokens, { ex: 'http://example.org/' });
            (provider as any)._contextService = ({
                getDocumentContext: () => mockCtx,
                getDocumentContextFromUri: vi.fn(() => ({ subjects: { 'http://example.org/Foo': true } })),
                contexts: {},
            });

            const doc = createMockTextDocument('', { uri: 'file:///w/test.ttl' });
            const result = (provider as any).getCompletionItems(doc, mockCtx, tokens, 1);

            expect(result.items).toHaveLength(1);
            expect(result.isIncomplete).toBe(false);
        });

        it('assigns distinct item kinds for classes, data properties, relations and individuals', () => {
            const provider = makeProvider();
            const ns = 'http://example.org/';
            const tokens = [
                makeToken(RdfToken.PERIOD.name, '.'),
                makeToken(RdfToken.PNAME_LN.name, 'ex:'),
            ];
            const mockCtx = makeMockContext(tokens, { ex: ns });
            const subjects = {
                [`${ns}Building`]: true,          // class
                [`${ns}hasPart`]: true,           // object property (relation)
                [`${ns}name`]: true,              // data property (literal range)
                [`${ns}factory1`]: true,          // individual
            };

            (provider as any)._contextService = ({
                getDocumentContext: () => mockCtx,
                getDocumentContextFromUri: vi.fn(() => ({ subjects })),
                contexts: {},
            });
            (provider as any)._vocabulary = ({
                getClasses: () => [`${ns}Building`],
                getProperties: () => [`${ns}hasPart`, `${ns}name`],
                // 'name' has a literal range → data property; 'hasPart' has none → object property.
                getRange: (_graphs: any, iri: string) => iri === `${ns}name` ? 'http://www.w3.org/2001/XMLSchema#string' : undefined,
                getDatatype: () => undefined,
            });

            const doc = createMockTextDocument('', { uri: 'file:///w/test.ttl' });
            const result = (provider as any).getCompletionItems(doc, mockCtx, tokens, 1);
            const kindOf = (label: string) => result.items.find((i: any) => i.label === label)?.kind;

            expect(kindOf('Building')).toBe(vscode.CompletionItemKind.Class);
            expect(kindOf('name')).toBe(vscode.CompletionItemKind.Field);
            expect(kindOf('hasPart')).toBe(vscode.CompletionItemKind.Interface);
            expect(kindOf('factory1')).toBe(vscode.CompletionItemKind.Value);
        });

        it('ranks classes first for the object of a type assertion', () => {
            const provider = makeProvider();
            const ns = 'http://example.org/';
            const tokens = [
                makeToken('VAR1', '?s'),
                makeToken(RdfToken.A.name, 'a'),
                makeToken(RdfToken.PNAME_NS.name, 'ex:'),
            ];
            const mockCtx = makeMockContext(tokens, { ex: ns });
            const subjects = {
                [`${ns}aProperty`]: true,
                [`${ns}bIndividual`]: true,
                [`${ns}cClass`]: true,
            };

            (provider as any)._contextService = ({
                getDocumentContext: () => mockCtx,
                getDocumentContextFromUri: vi.fn(() => ({ subjects })),
                contexts: {},
            });
            (provider as any)._vocabulary = ({
                getClasses: () => [`${ns}cClass`],
                getProperties: () => [`${ns}aProperty`],
                getRange: () => undefined,
                getDatatype: () => undefined,
            });

            const doc = createMockTextDocument('', { uri: 'file:///w/test.ttl' });
            const result = (provider as any).getCompletionItems(doc, mockCtx, tokens, 2);
            const labels = result.items.map((i: any) => i.label);

            // Despite the alphabetical order, the class ranks first, the property last.
            expect(labels).toEqual(['cClass', 'bIndividual', 'aProperty']);
            // The sort text encodes the priority so the widget order matches.
            expect(result.items[0].sortText).toBe('0_cClass');
            expect(result.items[1].sortText).toBe('1_bIndividual');
            expect(result.items[2].sortText).toBe('2_aProperty');
        });

        it('ranks classes first when the type assertion uses an explicit rdf:type predicate', () => {
            const provider = makeProvider();
            const ns = 'http://example.org/';
            const tokens = [
                makeToken(RdfToken.PNAME_LN.name, 'ex:thing'),
                makeToken(RdfToken.PNAME_LN.name, 'rdf:type'),
                makeToken(RdfToken.PNAME_NS.name, 'ex:'),
            ];
            const mockCtx = makeMockContext(tokens, {
                ex: ns,
                rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
            });
            const subjects = {
                [`${ns}aIndividual`]: true,
                [`${ns}bClass`]: true,
            };

            (provider as any)._contextService = ({
                getDocumentContext: () => mockCtx,
                getDocumentContextFromUri: vi.fn(() => ({ subjects })),
                contexts: {},
            });
            (provider as any)._vocabulary = ({
                getClasses: () => [`${ns}bClass`],
                getProperties: () => [],
                getRange: () => undefined,
                getDatatype: () => undefined,
            });

            const doc = createMockTextDocument('', { uri: 'file:///w/test.ttl' });
            const result = (provider as any).getCompletionItems(doc, mockCtx, tokens, 2);
            const labels = result.items.map((i: any) => i.label);

            expect(labels).toEqual(['bClass', 'aIndividual']);
        });

        it('ranks classes and individuals before properties in subject position', () => {
            const provider = makeProvider();
            const ns = 'http://example.org/';
            const tokens = [
                makeToken(RdfToken.PERIOD.name, '.'),
                makeToken(RdfToken.PNAME_NS.name, 'ex:'),
            ];
            const mockCtx = makeMockContext(tokens, { ex: ns });
            const subjects = {
                [`${ns}aProperty`]: true,
                [`${ns}bClass`]: true,
                [`${ns}cIndividual`]: true,
            };

            (provider as any)._contextService = ({
                getDocumentContext: () => mockCtx,
                getDocumentContextFromUri: vi.fn(() => ({ subjects })),
                contexts: {},
            });
            (provider as any)._vocabulary = ({
                getClasses: () => [`${ns}bClass`],
                getProperties: () => [`${ns}aProperty`],
                getRange: () => undefined,
                getDatatype: () => undefined,
            });

            const doc = createMockTextDocument('', { uri: 'file:///w/test.ttl' });
            const result = (provider as any).getCompletionItems(doc, mockCtx, tokens, 1);
            const labels = result.items.map((i: any) => i.label);

            // Classes and individuals share the top priority (label-sorted within it);
            // the property ranks last.
            expect(labels).toEqual(['bClass', 'cIndividual', 'aProperty']);
        });

        it('lets preferred categories survive truncation', () => {
            const provider = makeProvider();
            const ns = 'http://example.org/';
            const tokens = [
                makeToken('VAR1', '?s'),
                makeToken(RdfToken.A.name, 'a'),
                makeToken(RdfToken.PNAME_NS.name, 'ex:'),
            ];
            const mockCtx = makeMockContext(tokens, { ex: ns });
            // 12 properties sorting alphabetically before the single class.
            const subjects: Record<string, boolean> = {};
            const propertyIris: string[] = [];

            for (let i = 0; i < 12; i++) {
                const iri = `${ns}a${String.fromCharCode(65 + i)}Property`;
                subjects[iri] = true;
                propertyIris.push(iri);
            }

            subjects[`${ns}zClass`] = true;

            (provider as any)._contextService = ({
                getDocumentContext: () => mockCtx,
                getDocumentContextFromUri: vi.fn(() => ({ subjects })),
                contexts: {},
            });
            (provider as any)._vocabulary = ({
                getClasses: () => [`${ns}zClass`],
                getProperties: () => propertyIris,
                getRange: () => undefined,
                getDatatype: () => undefined,
            });

            const doc = createMockTextDocument('', { uri: 'file:///w/test.ttl' });
            const result = (provider as any).getCompletionItems(doc, mockCtx, tokens, 2);

            // Without ranking, the class would be cut off by the label-sorted truncation.
            expect(result.items[0].label).toBe('zClass');
            expect(result.isIncomplete).toBe(true);
        });

        it('surfaces items beyond the truncation cut-off when the typed local part narrows the search', () => {
            const provider = makeProvider();
            // More than maxCompletionItems subjects; the target sorts after the cut-off
            // for the broad 'nexus:' query but is the only match for 'nexus:SparePartStor'.
            const subjects: Record<string, boolean> = {};
            for (let i = 0; i < 15; i++) {
                subjects[`http://example.org/nexus#Class${String.fromCharCode(65 + i)}`] = true;
            }
            subjects['http://example.org/nexus#SparePartStorageFacility'] = true;

            const mockCtx = makeMockContext([], { nexus: 'http://example.org/nexus#' });

            (provider as any)._contextService = ({
                getDocumentContext: () => mockCtx,
                getDocumentContextFromUri: vi.fn(() => ({ subjects })),
                contexts: {},
            });

            const doc = createMockTextDocument('', { uri: 'file:///w/query.sparql' });

            // Broad query at the 'nexus:' trigger — result is truncated and incomplete.
            const broadTokens = [
                makeToken(RdfToken.A.name, 'a'),
                makeToken(RdfToken.PNAME_NS.name, 'nexus:'),
            ];
            const broad = (provider as any).getCompletionItems(doc, mockCtx, broadTokens, 1);
            expect(broad.isIncomplete).toBe(true);
            expect(broad.items.some((i: any) => i.label === 'SparePartStorageFacility')).toBe(false);

            // Narrowed re-query after the user typed the local part.
            const narrowTokens = [
                makeToken(RdfToken.A.name, 'a'),
                makeToken(RdfToken.PNAME_LN.name, 'nexus:SparePartStor'),
            ];
            const narrow = (provider as any).getCompletionItems(doc, mockCtx, narrowTokens, 1);
            expect(narrow.items.some((i: any) => i.label === 'SparePartStorageFacility')).toBe(true);
            expect(narrow.isIncomplete).toBe(false);
        });
    });

    describe('_addLocalPartCompletionItem', () => {
        it('returns early without adding item when localPart is empty', () => {
            const provider = new TurtleCompletionItemProvider(createMockDocumentContextService(), createTestVocabulary());
            const result: Record<string, any> = {};
            // IRI ending in '/' has empty local part → triggers the !localPart return
            (provider as any)._addLocalPartCompletionItem(result, 'http://example.org/', 'http://example.org/');
            expect(Object.keys(result)).toHaveLength(0);
        });
    });
});
