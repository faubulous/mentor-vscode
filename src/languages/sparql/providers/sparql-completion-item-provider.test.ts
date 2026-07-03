import { describe, it, expect, vi } from 'vitest';
import { RdfToken } from '@faubulous/mentor-rdf-parsers';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

const { mockResolve } = vi.hoisted(() => ({
    mockResolve: vi.fn(() => ({}))
}));

// Mock DI container — methods that use container.resolve() are not under test
vi.mock('tsyringe', () => ({
    container: { resolve: mockResolve },
    injectable: () => (_target: any) => _target,
    inject: () => () => {},
    singleton: () => (_target: any) => _target,
}));

// Mock the turtle providers barrel to prevent static initializer crashes from
// vscode.CompletionItem and vscode.CodeActionKind lacking full implementations
vi.mock('@src/languages/turtle/providers', () => ({
    TurtleCompletionItemProvider: class {
        readonly maxCompletionItems = 10;
        get contextService() { return {}; }
        get vocabulary() { return {}; }
        resolveCompletionItem(item: any) { return item; }
        provideCompletionItems() { return null; }
        getCompletionItems() { return null; }
    },
}));

// Mock TurtleDocument to prevent full parse setup
vi.mock('@src/languages/turtle/turtle-document', () => ({
    TurtleDocument: class {
        constructor(public uri: any, public syntax: any) {}
        get tokens() { return []; }
        get isParsed() { return false; }
    }
}));

vi.mock('@src/languages/turtle', () => ({
    TurtleDocument: class {
        constructor(public uri: any, public syntax: any) {}
        get tokens() { return []; }
    }
}));

import { SparqlCompletionItemProvider } from '@src/languages/sparql/providers/sparql-completion-item-provider';

/**
 * Creates a minimal fake IToken for testing.
 * Positions are 1-based (Chevrotain convention) and place the token at line 1, col 1.
 */
function makeToken(name: string, image: string) {
    return { tokenType: { name }, image, startLine: 1, startColumn: 1, endLine: 1, endColumn: image.length };
}

/**
 * Stub document for tests that need document.uri.
 * Accepts an optional content string that getText(range) extracts from.
 */
function makeDoc(uri = 'file:///test.sparql', content = '') {
    return {
        uri,
        getText: (range?: any) => {
            if (!range) return content;
            return content.substring(range.start.character, range.end.character);
        },
        positionAt: () => ({ line: 0, character: 0 })
    };
}

/**
 * Creates a fake TurtleDocument context with the given tokens.
 */
function makeContext(tokens: any[]) {
    return { tokens };
}

describe('SparqlCompletionItemProvider', () => {
    const provider = new SparqlCompletionItemProvider();

    describe('isGraphDefinitionContext', () => {
        it('returns true when current token starts with < and previous is GRAPH', () => {
            const context = makeContext([
                makeToken(RdfToken.GRAPH.name, 'GRAPH'),
                makeToken(RdfToken.IRIREF.name, '<'),
            ]);
            expect(provider.isGraphDefinitionContext(context as any, 1)).toBe(true);
        });

        it('returns true when current token starts with < and previous is FROM', () => {
            const context = makeContext([
                makeToken(RdfToken.FROM.name, 'FROM'),
                makeToken(RdfToken.IRIREF.name, '<http://'),
            ]);
            expect(provider.isGraphDefinitionContext(context as any, 1)).toBe(true);
        });

        it('returns true when current token starts with < and previous is NAMED', () => {
            const context = makeContext([
                makeToken(RdfToken.NAMED.name, 'NAMED'),
                makeToken(RdfToken.IRIREF.name, '<http://example.org/>'),
            ]);
            expect(provider.isGraphDefinitionContext(context as any, 1)).toBe(true);
        });

        it('returns true when previous token is < and token before that is GRAPH', () => {
            const context = makeContext([
                makeToken(RdfToken.GRAPH.name, 'GRAPH'),
                makeToken('LT', '<'),
                makeToken(RdfToken.PNAME_NS.name, 'http'),
            ]);
            // token at index 2 is 'http', token[1] is '<'
            expect(provider.isGraphDefinitionContext(context as any, 2)).toBe(true);
        });

        it('returns false when previous token is not GRAPH, FROM, or NAMED', () => {
            const context = makeContext([
                makeToken(RdfToken.PNAME_NS.name, 'ex:'),
                makeToken(RdfToken.IRIREF.name, '<http://example.org/>'),
            ]);
            expect(provider.isGraphDefinitionContext(context as any, 1)).toBe(false);
        });

        it('returns false when current token does not start with < and previous is not <', () => {
            const context = makeContext([
                makeToken(RdfToken.GRAPH.name, 'GRAPH'),
                makeToken(RdfToken.PNAME_LN.name, 'ex:myGraph'),
            ]);
            // 'ex:myGraph' does not start with '<'
            expect(provider.isGraphDefinitionContext(context as any, 1)).toBe(false);
        });

        it('returns false when previous token is < but the one before is not GRAPH/FROM/NAMED', () => {
            const context = makeContext([
                makeToken(RdfToken.PNAME_LN.name, 'ex:foo'),
                makeToken('LT', '<'),
                makeToken(RdfToken.PNAME_NS.name, 'http'),
            ]);
            expect(provider.isGraphDefinitionContext(context as any, 2)).toBe(false);
        });

        it('triggerCharacters includes : and <', () => {
            expect(provider.triggerCharacters.has(':')).toBe(true);
            expect(provider.triggerCharacters.has('<')).toBe(true);
        });
    });

    describe('getGraphIriCompletionItems', () => {
        const graphs = [
            'http://example.org/graph1',
            'http://example.org/graph2',
            'http://other.org/graph3',
        ];

        function makeProviderWithGraphs(available: string[]): SparqlCompletionItemProvider {
            const p = new SparqlCompletionItemProvider();

            vi.spyOn(p as any, 'connectionService', 'get').mockReturnValue({
                getConnectionForDocument: () => ({ id: 'workspace', autoLoadGraphs: false }),
                getInferenceEnabled: () => false,
            });

            vi.spyOn(p as any, 'graphService', 'get').mockReturnValue({
                hasGraphsForConnection: () => true,
                getGraphsForConnection: () => available,
            });

            return p;
        }

        it('returns completion items for all graphs when token image is <', async () => {
            const p = makeProviderWithGraphs(graphs);

            const context = makeContext([makeToken(RdfToken.IRIREF.name, '<')]);
            const items = await p.getGraphIriCompletionItems(makeDoc() as any, context as any, 0);

            expect(items.length).toBe(3);
        });

        it('filters graphs by the already-typed prefix', async () => {
            const p = makeProviderWithGraphs(graphs);

            const context = makeContext([makeToken(RdfToken.IRIREF.name, '<http://example')]);
            const items = await p.getGraphIriCompletionItems(makeDoc('file:///test.sparql', '<http://example') as any, context as any, 0);

            expect(items.length).toBe(2);
            expect(items.every(i => (i.label as string).startsWith('http://example.org'))).toBe(true);
        });

        it('uses the full graph IRI as the label when no prefix is typed', async () => {
            const p = makeProviderWithGraphs(graphs);

            const context = makeContext([makeToken(RdfToken.IRIREF.name, '<')]);
            const items = await p.getGraphIriCompletionItems(makeDoc() as any, context as any, 0);
            const labels = items.map(i => i.label as string);

            expect(labels).toEqual(expect.arrayContaining(graphs));
        });

        it('strips the trailing > from a closed token image', async () => {
            const p = makeProviderWithGraphs(['http://example.org/g']);

            // Closed token e.g. <htt> produced by VS Code IRI auto-close
            const context = makeContext([makeToken(RdfToken.IRIREF.name, '<htt>')]);
            const items = await p.getGraphIriCompletionItems(makeDoc() as any, context as any, 0);

            // The typed value is 'htt', which 'http://example.org/g' starts with
            expect(items.length).toBe(1);
        });

        it('returns empty array when no graphs match', async () => {
            const p = makeProviderWithGraphs(graphs);
            const context = makeContext([makeToken(RdfToken.IRIREF.name, '<https://nomatch')]);
            const items = await p.getGraphIriCompletionItems(makeDoc('file:///test.sparql', '<https://nomatch') as any, context as any, 0);
            expect(items.length).toBe(0);
        });

        it('returns empty array when connection has no graphs', async () => {
            const p = makeProviderWithGraphs([]);
            const context = makeContext([makeToken(RdfToken.IRIREF.name, '<')]);
            const items = await p.getGraphIriCompletionItems(makeDoc() as any, context as any, 0);
            expect(items).toHaveLength(0);
        });

        it('shows the full IRI as the label while inserting only the untyped suffix', async () => {
            // value typed = 'workspace', graph = 'workspace:g1' → label is the full IRI,
            // but insertText is the untyped suffix ':g1>' so the typed prefix is not duplicated.
            const p = makeProviderWithGraphs(['workspace:g1']);
            const context = makeContext([makeToken(RdfToken.IRIREF.name, '<workspace')]);
            const items = await p.getGraphIriCompletionItems(makeDoc('file:///test.sparql', '<workspace') as any, context as any, 0);
            expect(items.length).toBe(1);
            expect(items[0].label).toBe('workspace:g1');
            expect((items[0].insertText as any).value).toBe(':g1>');
        });

        it('inserts the untyped suffix preserving all path slashes', async () => {
            // At the ':' trigger, value = 'workspace:', suffix = '///data.ttl'.
            // The inserted suffix must keep all three slashes so the result is
            // 'workspace:///data.ttl', not 'workspace://data.ttl'.
            const p = makeProviderWithGraphs(['workspace:///data.ttl']);
            const iriToken = makeToken(RdfToken.IRIREF.name, '<workspace:');
            const context = makeContext([iriToken]);
            const items = await p.getGraphIriCompletionItems(
                makeDoc('file:///w/query.sparql', '<workspace:') as any,
                context as any,
                0,
            );
            expect(items).toHaveLength(1);
            // Label shows the full IRI; insertText is the untyped suffix with all slashes.
            expect(items[0].label).toBe('workspace:///data.ttl');
            expect((items[0].insertText as any).value).toBe('///data.ttl>');
        });

        it('includes workspace graphs provided by the connection', async () => {
            const p = makeProviderWithGraphs(['workspace:///data.ttl']);
            const context = makeContext([makeToken(RdfToken.IRIREF.name, '<')]);
            const items = await p.getGraphIriCompletionItems(makeDoc('file:///w/query.sparql') as any, context as any, 0);
            const labels = items.map(i => i.label as string);
            expect(labels).toContain('workspace:///data.ttl');
        });

        it('deduplicates repeated graph IRIs', async () => {
            const sharedIri = 'workspace:///shared.ttl';
            const p = makeProviderWithGraphs([sharedIri, sharedIri]);
            const context = makeContext([makeToken(RdfToken.IRIREF.name, '<')]);
            const items = await p.getGraphIriCompletionItems(makeDoc('file:///w/query.sparql') as any, context as any, 0);
            expect(items).toHaveLength(1);
            expect(items[0].label).toBe(sharedIri);
        });

        it('returns both remote and workspace graphs from the connection', async () => {
            const p = makeProviderWithGraphs(['http://example.org/remote', 'workspace:///data.ttl']);
            const context = makeContext([makeToken(RdfToken.IRIREF.name, '<')]);
            const items = await p.getGraphIriCompletionItems(makeDoc('file:///w/query.sparql') as any, context as any, 0);
            const labels = items.map(i => i.label as string);
            expect(labels).toContain('http://example.org/remote');
            expect(labels).toContain('workspace:///data.ttl');
        });

        it('includes notebook cell workspace URIs in completion candidates', async () => {
            const p = makeProviderWithGraphs(['workspace:///notebook.mnb#my-data']);
            const context = makeContext([makeToken(RdfToken.IRIREF.name, '<')]);
            const items = await p.getGraphIriCompletionItems(makeDoc('vscode-notebook-cell:///w/notebook.mnb#opaqueCell2') as any, context as any, 0);
            const labels = items.map(i => i.label as string);
            expect(labels).toContain('workspace:///notebook.mnb#my-data');
        });

        it('matches workspace cell IRIs by slug substring when prefix does not match', async () => {
            // User types `workspace:///my-data` — the IRI starts with `workspace:///notebook.mnb`,
            // so prefix matching fails. Substring matching on the part after `workspace:///` must
            // find it.
            const p = makeProviderWithGraphs(['workspace:///notebook.mnb#my-data']);
            const iriToken = makeToken(RdfToken.IRIREF.name, '<workspace:///my-data');
            const context = makeContext([iriToken]);
            const items = await p.getGraphIriCompletionItems(
                makeDoc('file:///w/query.sparql', '<workspace:///my-data') as any,
                context as any,
                0,
            );
            expect(items).toHaveLength(1);
            expect(items[0].label).toBe('workspace:///notebook.mnb#my-data');
            // insertText must be the full IRI (replacing the typed text), not just a suffix
            expect((items[0].insertText as any).value).toContain('workspace:///notebook.mnb#my-data');
            // range must be set so the full typed text is replaced
            expect(items[0].range).toBeDefined();
        });

        it('does not apply substring matching to non-workspace IRIs', async () => {
            // Only workspace: URIs get the substring fallback; HTTP graphs must prefix-match.
            const p = makeProviderWithGraphs(['http://example.org/graph-cell-1']);
            const iriToken = makeToken(RdfToken.IRIREF.name, '<workspace:///cell');
            const context = makeContext([iriToken]);
            const items = await p.getGraphIriCompletionItems(
                makeDoc('file:///w/query.sparql', '<workspace:///cell') as any,
                context as any,
                0,
            );
            // http:// IRI does not start with workspace:/// so substring match is not attempted
            expect(items).toHaveLength(0);
        });

        it('uses prefix match (not substring) when the typed value already prefixes the IRI', async () => {
            // `workspace:///notebook` is a prefix of `workspace:///notebook.mnb#cell-1`,
            // so it takes the prefix-match path and the label is the suffix only.
            const p = makeProviderWithGraphs(['workspace:///notebook.mnb#cell-1']);
            const iriToken = makeToken(RdfToken.IRIREF.name, '<workspace:///notebook');
            const context = makeContext([iriToken]);
            const items = await p.getGraphIriCompletionItems(
                makeDoc('file:///w/query.sparql', '<workspace:///notebook') as any,
                context as any,
                0,
            );
            expect(items).toHaveLength(1);
            // Prefix match: label is the full IRI, range is NOT set, only the suffix is inserted.
            expect(items[0].label).toBe('workspace:///notebook.mnb#cell-1');
            expect((items[0].insertText as any).value).toBe('.mnb#cell-1>');
            expect(items[0].range).toBeUndefined();
        });

        it('sets filterText to the full IRI with # replaced by space for workspace IRIs', async () => {
            // The full 'workspace:///' scheme is kept so typing it matches at position 0
            // (and ranks first). VS Code then fuzzy-filters using filterText as the user
            // continues typing. '#' is replaced with a space so VS Code treats slug names
            // after the fragment (e.g. 'cell-1') as word starts.
            const p = makeProviderWithGraphs([
                'workspace:///notebook.mnb#cell-1',
                'workspace:///classes.ttl',
            ]);
            // Simulate the state at the `workspace:` trigger — value is 'workspace:'
            const iriToken = makeToken(RdfToken.IRIREF.name, '<workspace:');
            const context = makeContext([iriToken]);
            const items = await p.getGraphIriCompletionItems(
                makeDoc('file:///w/query.sparql', '<workspace:') as any,
                context as any,
                0,
            );
            expect(items).toHaveLength(2);

            const cellItem = items.find(i => (i.label as string).includes('cell-1'))!;
            const fileItem = items.find(i => (i.label as string).includes('classes'))!;

            // Cell: '#' is replaced with space so 'cell-1' is a separate word start.
            expect(cellItem.filterText).toBe('workspace:///notebook.mnb cell-1');
            // File: no fragment, filterText is the full IRI.
            expect(fileItem.filterText).toBe('workspace:///classes.ttl');
        });

        it('sets filterText for workspace IRIs matched by substring', async () => {
            const p = makeProviderWithGraphs(['workspace:///notebook.mnb#my-data']);
            const iriToken = makeToken(RdfToken.IRIREF.name, '<workspace:///my-data');
            const context = makeContext([iriToken]);
            const items = await p.getGraphIriCompletionItems(
                makeDoc('file:///w/query.sparql', '<workspace:///my-data') as any,
                context as any,
                0,
            );
            expect(items).toHaveLength(1);
            expect(items[0].filterText).toBe('workspace:///notebook.mnb my-data');
        });
    });

    describe('getCompletionItems', () => {
        it('delegates to getGraphIriCompletionItems when in graph definition context', async () => {
            const p = new SparqlCompletionItemProvider();
            const doc = makeDoc() as any;
            const context = makeContext([
                makeToken(RdfToken.GRAPH.name, 'GRAPH'),
                makeToken(RdfToken.IRIREF.name, '<'),
            ]) as any;
            vi.spyOn(p, 'getGraphIriCompletionItems').mockResolvedValue([]);
            await p.getCompletionItems(doc, context, 1);
            expect(p.getGraphIriCompletionItems).toHaveBeenCalledWith(doc, context, 1);
        });

        it('calls super.getCompletionItems when not in graph definition context', () => {
            const p = new SparqlCompletionItemProvider();
            const doc = makeDoc() as any;
            const context = makeContext([
                makeToken('DOT', '.'),
                makeToken('PNAME_NS', 'ex:'),
            ]) as any;
            // isGraphDefinitionContext returns false → parent mock returns null
            const result = p.getCompletionItems(doc, context, 1);
            expect(result).toBeNull();
        });
    });

    describe('provideCompletionItems', () => {
        it('returns null when context is null', async () => {
            const p = new SparqlCompletionItemProvider();
            vi.spyOn(p as any, 'contextService', 'get').mockReturnValue({
                getDocumentContext: vi.fn(() => null),
            });
            const result = await p.provideCompletionItems(
                makeDoc() as any, {} as any, {} as any, {} as any
            );
            expect(result).toBeNull();
        });

        it('returns null when n < 1 and token delivery rejects', async () => {
            const p = new SparqlCompletionItemProvider();
            vi.spyOn(p as any, 'contextService', 'get').mockReturnValue({
                getDocumentContext: vi.fn(() => ({
                    getTokenIndexAtPosition: vi.fn(() => 0),
                    tokens: [],
                })),
                onNextTokenDelivery: vi.fn(() => Promise.reject(new Error('timeout'))),
            });
            const result = await p.provideCompletionItems(
                makeDoc() as any, {} as any, {} as any, {} as any
            );
            expect(result).toBeNull();
        });

        it('returns null when n < 1 after token delivery resolves', async () => {
            const p = new SparqlCompletionItemProvider();
            vi.spyOn(p as any, 'contextService', 'get').mockReturnValue({
                getDocumentContext: vi.fn(() => ({
                    getTokenIndexAtPosition: vi.fn(() => 0),
                    tokens: [],
                })),
                onNextTokenDelivery: vi.fn(() => Promise.resolve()),
            });
            const result = await p.provideCompletionItems(
                makeDoc() as any, {} as any, {} as any, {} as any
            );
            expect(result).toBeNull();
        });

        it('calls getCompletionItems when n >= 1', async () => {
            const p = new SparqlCompletionItemProvider();
            vi.spyOn(p as any, 'contextService', 'get').mockReturnValue({
                getDocumentContext: vi.fn(() => ({
                    getTokenIndexAtPosition: vi.fn(() => 1),
                    tokens: [
                        makeToken('DOT', '.'),
                        makeToken('PNAME_NS', 'ex:'),
                    ],
                })),
            });
            // super.getCompletionItems (mock) returns null; this confirms the flow reached line 58
            const result = await p.provideCompletionItems(
                makeDoc() as any, {} as any, {} as any, {} as any
            );
            expect(result).toBeNull();
        });

        it('connectionService getter calls container.resolve', async () => {
            const mockConnection = {
                getConnectionForDocument: () => ({ id: 'workspace', autoLoadGraphs: false }),
                getInferenceEnabled: () => false,
                hasGraphsForConnection: () => true,
                getGraphsForConnection: () => ['http://example.org/g'],
            };
            mockResolve.mockReturnValue(mockConnection);
            const p = new SparqlCompletionItemProvider();
            // Call the getter without a spy so line 30 executes
            const context = makeContext([makeToken(RdfToken.IRIREF.name, '<')]) as any;
            const items = await p.getGraphIriCompletionItems(makeDoc() as any, context, 0);
            expect(items.length).toBe(1);
        });
    });
});
