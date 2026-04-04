import { describe, it, expect, vi } from 'vitest';
import { RdfToken } from '@faubulous/mentor-rdf-parsers';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

// Mock DI container — methods that use container.resolve() are not under test
vi.mock('tsyringe', () => ({
    container: { resolve: vi.fn(() => ({})) },
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
        get hasTokens() { return false; }
    }
}));

vi.mock('@src/languages/turtle', () => ({
    TurtleDocument: class {
        constructor(public uri: any, public syntax: any) {}
        get tokens() { return []; }
    }
}));

import { SparqlCompletionItemProvider } from './sparql-completion-item-provider';

/**
 * Creates a minimal fake IToken for testing.
 */
function makeToken(name: string, image: string) {
    return { tokenType: { name }, image };
}

/**
 * Stub document for tests that need document.uri.
 */
function makeDoc(uri = 'file:///test.sparql') {
    return { uri, getText: () => '', positionAt: () => ({ line: 0, character: 0 }) };
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
                getGraphsForDocument: async () => available,
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
            const items = await p.getGraphIriCompletionItems(makeDoc() as any, context as any, 0);
            expect(items.length).toBe(2);
            expect(items.every(i => (i.detail as string).startsWith('http://example.org'))).toBe(true);
        });

        it('sets the detail to the full graph IRI', async () => {
            const p = makeProviderWithGraphs(graphs);
            const context = makeContext([makeToken(RdfToken.IRIREF.name, '<')]);
            const items = await p.getGraphIriCompletionItems(makeDoc() as any, context as any, 0);
            const iris = items.map(i => i.detail as string);
            expect(iris).toEqual(expect.arrayContaining(graphs));
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
            const items = await p.getGraphIriCompletionItems(makeDoc() as any, context as any, 0);
            expect(items.length).toBe(0);
        });

        it('returns empty array when connection has no graphs', async () => {
            const p = makeProviderWithGraphs([]);
            const context = makeContext([makeToken(RdfToken.IRIREF.name, '<')]);
            const items = await p.getGraphIriCompletionItems(makeDoc() as any, context as any, 0);
            expect(items).toHaveLength(0);
        });
    });
});
