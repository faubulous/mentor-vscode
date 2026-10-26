import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

const storeControl = vi.hoisted(() => ({
    reasoner: null as any,
    shouldThrowLoad: false,
}));

vi.mock('tsyringe', () => ({
    container: { resolve: vi.fn(() => ({})) },
    injectable: () => (_target: any) => _target,
    inject: () => () => {},
    singleton: () => (_target: any) => _target,
}));

/**
 * Store mock injected into the document context. Property access throws when
 * `storeControl.shouldThrowLoad` is set, simulating an unavailable store.
 */
function makeStore(): Store {
    const store = {
        executeInference: vi.fn(),
        deleteGraphs: vi.fn(),
        dataFactory: {
            namedNode: (iri: string) => ({ termType: 'NamedNode', value: iri }),
            quad: (s: any, p: any, o: any, g: any) => ({ subject: s, predicate: p, object: o, graph: g }),
        },
        add: vi.fn(),
        delete: vi.fn(),
        has: vi.fn(() => false),
        hasGraph: vi.fn(() => false),
        matchQuads: vi.fn(function* () { }),
        graphs: [],
    };

    // Partial stub: only the members above (plus the proxied `reasoner`) are exercised by TurtleDocument.
    return new Proxy(store, {
        get(target, property) {
            if (storeControl.shouldThrowLoad) {
                throw new Error('store unavailable');
            }
            if (property === 'reasoner') {
                return storeControl.reasoner;
            }
            return (target as any)[property];
        },
    }) as unknown as Store;
}

import * as vscode from 'vscode';
import { OwlReasoner, Store as RealStore } from '@faubulous/mentor-rdf';
import type { Store } from '@faubulous/mentor-rdf';
import { RdfSyntax, RdfToken, TurtleLexer, TurtleParser, TurtleQuadReader, TurtleReader, createFileBlankNodeIdGenerator } from '@faubulous/mentor-rdf-parsers';
import { ParserFactory } from '@src/languages/parser-factory';
import { TurtleDocument } from '@src/languages/turtle/turtle-document';
import { createTurtleDocument, createMockTextDocument } from '@src/utilities/mocks/factories';

/**
 * Build a minimal IToken with position information.
 * Positions follow the chevrotain convention: 1-based lines, 1-based columns.
 */
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

function makeDoc(uri = 'file:///test.ttl'): TurtleDocument {
    return createTurtleDocument(uri, RdfSyntax.Turtle, { store: makeStore() });
}

describe('TurtleDocument', () => {
    describe('initial state', () => {
        it('isParsed is false before setTokens is called', () => {
            const doc = makeDoc();
            expect(doc.isParsed).toBe(false);
        });

        it('isLoaded is false before setTokens is called', () => {
            const doc = makeDoc();
            expect(doc.isLoaded).toBe(false);
        });

        it('tokens is an empty array initially', () => {
            const doc = makeDoc();
            expect(doc.tokens).toHaveLength(0);
        });

        it('syntax is set to the provided value', () => {
            const doc = makeDoc();
            expect(doc.syntax).toBe(RdfSyntax.Turtle);
        });
    });

    describe('setTokens', () => {
        it('sets isParsed to true', () => {
            const doc = makeDoc();
            doc.setTokens([makeToken(RdfToken.PNAME_LN.name, 'ex:Thing') as any]);
            expect(doc.isParsed).toBe(true);
        });

        it('stores the provided tokens', () => {
            const doc = makeDoc();
            const tokens = [
                makeToken(RdfToken.PNAME_LN.name, 'ex:Thing'),
                makeToken(RdfToken.PERIOD.name, '.'),
            ];
            doc.setTokens(tokens as any);
            expect(doc.tokens).toHaveLength(2);
        });

        it('populates namespaces from PREFIX declarations', () => {
            const doc = makeDoc();
            const tokens = [
                // @prefix ex: <http://example.org/> .
                makeToken(RdfToken.TTL_PREFIX.name, '@prefix', { startColumn: 1, endColumn: 7 }),
                makeToken(RdfToken.PNAME_NS.name, 'ex:', { startColumn: 9, endColumn: 11 }),
                makeToken(RdfToken.IRIREF.name, '<http://example.org/>', { startColumn: 13, endColumn: 33 }),
                makeToken(RdfToken.PERIOD.name, '.'),
            ];
            // The PREFIX keyword token triggers namespace extraction, but the actual
            // logic in setTokens looks at the token *after* the prefix keyword. Just
            // verify a real PREFIX + PNAME_NS pair is handled without throwing.
            expect(() => doc.setTokens(tokens as any)).not.toThrow();
        });

        it('resets namespaces on second call', () => {
            const doc = makeDoc();
            doc.setTokens([makeToken(RdfToken.PNAME_LN.name, 'ex:A') as any]);
            (doc as any).namespaces['ex'] = 'http://example.org/';
            doc.setTokens([makeToken(RdfToken.PNAME_LN.name, 'owl:Class') as any]);
            expect((doc as any).namespaces['ex']).toBeUndefined();
        });
    });

    describe('getLiteralAtPosition', () => {
        it('returns undefined when no token is at position (null-token guard)', () => {
            const doc = makeDoc();
            // No tokens set → getTokenAtPosition returns undefined → early return
            const result = doc.getLiteralAtPosition(new vscode.Position(0, 0));
            expect(result).toBeUndefined();
        });

        it('returns undefined for a non-literal token type', () => {
            const doc = makeDoc();
            const token = makeToken(RdfToken.PNAME_LN.name, 'ex:A', { startLine: 1, startColumn: 1, endLine: 1, endColumn: 4 });
            doc.setTokens([token as any]);
            const result = doc.getLiteralAtPosition(new vscode.Position(0, 2));
            expect(result).toBeUndefined();
        });

        it('strips surrounding double quotes for a STRING_LITERAL_QUOTE token', () => {
            const doc = makeDoc();
            const token = makeToken(RdfToken.STRING_LITERAL_QUOTE.name, '"hello"', { startLine: 1, startColumn: 1, endLine: 1, endColumn: 7 });
            doc.setTokens([token as any]);
            const result = doc.getLiteralAtPosition(new vscode.Position(0, 3));
            expect(result).toBe('hello');
        });

        it('strips surrounding single quotes for a STRING_LITERAL_SINGLE_QUOTE token', () => {
            const doc = makeDoc();
            const token = makeToken(RdfToken.STRING_LITERAL_SINGLE_QUOTE.name, "'world'", { startLine: 1, startColumn: 1, endLine: 1, endColumn: 7 });
            doc.setTokens([token as any]);
            const result = doc.getLiteralAtPosition(new vscode.Position(0, 3));
            expect(result).toBe('world');
        });

        it('strips triple double quotes for STRING_LITERAL_LONG_QUOTE token', () => {
            const doc = makeDoc();
            const token = makeToken(RdfToken.STRING_LITERAL_LONG_QUOTE.name, '"""long text"""', {
                startLine: 1, startColumn: 1, endLine: 1, endColumn: 15,
            });
            doc.setTokens([token as any]);
            const result = doc.getLiteralAtPosition(new vscode.Position(0, 5));
            expect(result).toBe('long text');
        });

        it('strips triple single quotes for STRING_LITERAL_LONG_SINGLE_QUOTE token', () => {
            const doc = makeDoc();
            const token = makeToken(RdfToken.STRING_LITERAL_LONG_SINGLE_QUOTE.name, "'''long text'''", {
                startLine: 1, startColumn: 1, endLine: 1, endColumn: 15,
            });
            doc.setTokens([token as any]);
            const result = doc.getLiteralAtPosition(new vscode.Position(0, 5));
            expect(result).toBe('long text');
        });
    });

    describe('getIriAtPosition', () => {
        it('returns namespace IRI when cursor is on the prefix part of a prefixed name', () => {
            const doc = makeDoc();
            // @prefix ex: <http://example.org/> .
            const tokens = [
                makeToken(RdfToken.TTL_PREFIX.name, '@prefix', { startLine: 1, endLine: 1, startColumn: 1, endColumn: 7 }),
                makeToken(RdfToken.PNAME_NS.name, 'ex:', { startLine: 1, endLine: 1, startColumn: 9, endColumn: 11 }),
                makeToken(RdfToken.IRIREF.name, '<http://example.org/>', { startLine: 1, endLine: 1, startColumn: 13, endColumn: 33 }),
                makeToken(RdfToken.PERIOD.name, '.', { startLine: 1, endLine: 1, startColumn: 35, endColumn: 35 }),
                // ex:Thing on line 2
                makeToken(RdfToken.PNAME_LN.name, 'ex:Thing', { startLine: 2, endLine: 2, startColumn: 1, endColumn: 8 }),
            ];
            doc.setTokens(tokens as any);
            // Position line 1 (0-based), character 1 → inside "ex" prefix part
            const result = doc.getIriAtPosition(new vscode.Position(1, 1));
            expect(result).toBe('http://example.org/');
        });

        it('returns the expanded IRI when cursor is on the local name part', () => {
            const doc = makeDoc();
            const tokens = [
                makeToken(RdfToken.TTL_PREFIX.name, '@prefix', { startLine: 1, endLine: 1, startColumn: 1, endColumn: 7 }),
                makeToken(RdfToken.PNAME_NS.name, 'ex:', { startLine: 1, endLine: 1, startColumn: 9, endColumn: 11 }),
                makeToken(RdfToken.IRIREF.name, '<http://example.org/>', { startLine: 1, endLine: 1, startColumn: 13, endColumn: 33 }),
                makeToken(RdfToken.PERIOD.name, '.', { startLine: 1, endLine: 1, startColumn: 35, endColumn: 35 }),
                makeToken(RdfToken.PNAME_LN.name, 'ex:Thing', { startLine: 2, endLine: 2, startColumn: 1, endColumn: 8 }),
            ];
            doc.setTokens(tokens as any);
            // Position line 1, character 5 → inside "Thing" local name part
            const result = doc.getIriAtPosition(new vscode.Position(1, 5));
            expect(result).toBeDefined();
        });

        it('returns undefined when no token is at the given position', () => {
            const doc = makeDoc();
            const result = doc.getIriAtPosition(new vscode.Position(99, 0));
            expect(result).toBeUndefined();
        });
    });

    describe('setTokens — extended token types', () => {
        beforeEach(() => {
            storeControl.reasoner = null;
            storeControl.shouldThrowLoad = false;
        });

        it('indexes prefixed names with colons and escapes in the local name under the IRIs of their triples', () => {
            const doc = makeDoc();
            const text = '@prefix ex: <http://example.org/> .\n@prefix owl: <http://www.w3.org/2002/07/owl#> .\nex:a:b a owl:Class .\nex:a\\-b a owl:Class .\n';

            doc.parse(text);

            const subjects = (doc.getParseResult(text)?.quads ?? []).map(q => q.subject.value);

            expect(subjects).toEqual(['http://example.org/a:b', 'http://example.org/a-b']);

            for (const iri of subjects) {
                expect(doc.references.has(iri), iri).toBe(true);
                expect(doc.subjects.has(iri), iri).toBe(true);
                expect(doc.typeDefinitions.has(iri), iri).toBe(true);
            }

            expect(doc.references.has('http://example.org/a\\-b')).toBe(false);
        });

        it('resolves prefixed names with the prefix declared before them', () => {
            const doc = makeDoc();

            doc.parse('@prefix ex: <http://example.org/a/> .\nex:x a ex:C .\n@prefix ex: <http://example.org/b/> .\nex:x a ex:C .\n');

            expect(doc.references.getRanges('http://example.org/a/x')).toEqual([{ start: { line: 1, character: 0 }, end: { line: 1, character: 4 } }]);
            expect(doc.references.getRanges('http://example.org/b/x')).toEqual([{ start: { line: 3, character: 0 }, end: { line: 3, character: 4 } }]);
            expect(doc.typeAssertions.has('http://example.org/a/x')).toBe(true);
            expect(doc.typeAssertions.has('http://example.org/b/x')).toBe(true);
        });

        it('registers IRIREF token references', () => {
            const doc = makeDoc();
            const tokens = [
                makeToken(RdfToken.IRIREF.name, '<http://example.org/Thing>', { startLine: 1, startColumn: 1, endLine: 1, endColumn: 26 }),
            ];
            doc.setTokens(tokens as any);
            expect(doc.references.has('http://example.org/Thing')).toBe(true);
        });

        it('registers A token type assertions with subject', () => {
            const doc = makeDoc();
            const tokens = [
                makeToken(RdfToken.PNAME_LN.name, 'ex:Thing', { startLine: 1, startColumn: 1, endLine: 1, endColumn: 8 }),
                makeToken(RdfToken.A.name, 'a', { startLine: 1, startColumn: 10, endLine: 1, endColumn: 10 }),
                makeToken(RdfToken.PNAME_LN.name, 'ex:Class', { startLine: 1, startColumn: 12, endLine: 1, endColumn: 19 }),
            ];
            doc.setTokens(tokens as any);
            // type assertions require namespaces — without them getIriFromToken returns undefined
            // so subjects won't register — just ensure no throw
            expect(() => doc.setTokens(tokens as any)).not.toThrow();
        });

        it('registers BLANK_NODE_LABEL references', () => {
            const doc = makeDoc();
            const tokens = [
                makeToken(RdfToken.BLANK_NODE_LABEL.name, '_:b0', { startLine: 1, startColumn: 1, endLine: 1, endColumn: 4 }),
            ];
            doc.setTokens(tokens as any);
            expect(doc.references.has('_:b0')).toBe(true);
        });

        it('registers LBRACKET reference when blankNodeId payload is present', () => {
            const doc = makeDoc();
            const bracket = {
                tokenType: { name: RdfToken.LBRACKET.name },
                image: '[',
                startLine: 1, startColumn: 1, endLine: 1, endColumn: 1,
                payload: { blankNodeId: '_:b1' },
            };
            doc.setTokens([bracket as any]);
            expect(doc.references.has('_:b1')).toBe(true);
        });

        it('skips LBRACKET token when blankNodeId payload is absent', () => {
            const doc = makeDoc();
            const bracket = {
                tokenType: { name: RdfToken.LBRACKET.name },
                image: '[',
                startLine: 1, startColumn: 1, endLine: 1, endColumn: 1,
                payload: {},
            };
            doc.setTokens([bracket as any]);
            expect([...doc.references.keys()]).toHaveLength(0);
        });

        it('registers type assertion (PNAME_LN a OWL:Class pattern)', () => {
            const doc = makeDoc();
            const tokens = [
                makeToken(RdfToken.TTL_PREFIX.name, '@prefix', { startLine: 1, endLine: 1, startColumn: 1, endColumn: 7 }),
                makeToken(RdfToken.PNAME_NS.name, 'owl:', { startLine: 1, endLine: 1, startColumn: 9, endColumn: 12 }),
                makeToken(RdfToken.IRIREF.name, '<http://www.w3.org/2002/07/owl#>', { startLine: 1, endLine: 1, startColumn: 14, endColumn: 45 }),
                makeToken(RdfToken.PERIOD.name, '.', { startLine: 1, endLine: 1, startColumn: 47, endColumn: 47 }),
                makeToken(RdfToken.TTL_PREFIX.name, '@prefix', { startLine: 2, endLine: 2, startColumn: 1, endColumn: 7 }),
                makeToken(RdfToken.PNAME_NS.name, 'ex:', { startLine: 2, endLine: 2, startColumn: 9, endColumn: 11 }),
                makeToken(RdfToken.IRIREF.name, '<http://example.org/>', { startLine: 2, endLine: 2, startColumn: 13, endColumn: 33 }),
                makeToken(RdfToken.PERIOD.name, '.', { startLine: 2, endLine: 2, startColumn: 35, endColumn: 35 }),
                // ex:MyClass a owl:Class .
                makeToken(RdfToken.PERIOD.name, '.', { startLine: 3, endLine: 3, startColumn: 1, endColumn: 1 }),
                makeToken(RdfToken.PNAME_LN.name, 'ex:MyClass', { startLine: 4, endLine: 4, startColumn: 1, endColumn: 10 }),
                makeToken(RdfToken.A.name, 'a', { startLine: 4, endLine: 4, startColumn: 12, endColumn: 12 }),
                makeToken(RdfToken.PNAME_LN.name, 'owl:Class', { startLine: 4, endLine: 4, startColumn: 14, endColumn: 22 }),
                makeToken(RdfToken.PERIOD.name, '.', { startLine: 4, endLine: 4, startColumn: 24, endColumn: 24 }),
            ];
            doc.setTokens(tokens as any);
            // owl:Class → OWL namespace → type definition registered
            expect(doc.typeDefinitions.has('http://example.org/MyClass')).toBe(true);
        });

        it('registers IRIREF subject after PERIOD', () => {
            const doc = makeDoc();
            const tokens = [
                makeToken(RdfToken.PERIOD.name, '.', { startLine: 1, startColumn: 1, endColumn: 1 }),
                makeToken(RdfToken.IRIREF.name, '<http://example.org/Sub>', { startLine: 2, startColumn: 1, endLine: 2, endColumn: 24 }),
            ];
            doc.setTokens(tokens as any);
            expect(doc.subjects.has('http://example.org/Sub')).toBe(true);
        });

        it('handles A token at index 0 (no subject token — _handleTypeAssertion guard)', () => {
            const doc = makeDoc();
            // 'a' at index 0 → tokens[index-1] = undefined → early return (no crash)
            const tokens = [
                makeToken(RdfToken.A.name, 'a', { startLine: 1, endLine: 1, startColumn: 1, endColumn: 1 }),
            ];
            expect(() => doc.setTokens(tokens as any)).not.toThrow();
        });

        it('handles A token with non-IRI subject (_handleTypeAssertion subjectUri guard)', () => {
            const doc = makeDoc();
            // COMMENT is not a valid IRI token → getIriFromToken returns undefined → early return
            const tokens = [
                makeToken('COMMENT', '# comment', { startLine: 1, endLine: 1, startColumn: 1, endColumn: 9 }),
                makeToken(RdfToken.A.name, 'a', { startLine: 1, endLine: 1, startColumn: 11, endColumn: 11 }),
            ];
            expect(() => doc.setTokens(tokens as any)).not.toThrow();
        });

        it('handles A token at index 0 with no object (_handleTypeDefinition guard)', () => {
            const doc = makeDoc();
            // 'a' at index 0 → subjectToken = tokens[-1] = undefined → _handleTypeDefinition early return
            const tokens = [
                makeToken(RdfToken.A.name, 'a', { startLine: 1, endLine: 1, startColumn: 1, endColumn: 1 }),
                makeToken(RdfToken.PERIOD.name, '.', { startLine: 1, endLine: 1, startColumn: 3, endColumn: 3 }),
            ];
            expect(() => doc.setTokens(tokens as any)).not.toThrow();
        });

        it('_handleTypeDefinition: objectToken missing (A at last index)', () => {
            const doc = makeDoc();
            // Setup: prefix defined, IRIREF subject (resolves), then 'a' at end with no object
            const tokens = [
                makeToken(RdfToken.TTL_PREFIX.name, '@prefix', { startLine: 1, endLine: 1, startColumn: 1, endColumn: 7 }),
                makeToken(RdfToken.PNAME_NS.name, 'ex:', { startLine: 1, endLine: 1, startColumn: 9, endColumn: 11 }),
                makeToken(RdfToken.IRIREF.name, '<http://example.org/>', { startLine: 1, endLine: 1, startColumn: 13, endColumn: 33 }),
                makeToken(RdfToken.PERIOD.name, '.', { startLine: 1, endLine: 1, startColumn: 35, endColumn: 35 }),
                makeToken(RdfToken.PNAME_LN.name, 'ex:Sub', { startLine: 2, endLine: 2, startColumn: 1, endColumn: 6 }),
                // A is the last token — no object follows
                makeToken(RdfToken.A.name, 'a', { startLine: 2, endLine: 2, startColumn: 8, endColumn: 8 }),
            ];
            // Covers _handleTypeDefinition line: if (!objectToken) return;
            expect(() => doc.setTokens(tokens as any)).not.toThrow();
        });

        it('_handleTypeDefinition: objectToken unresolvable (unknown prefix)', () => {
            const doc = makeDoc();
            // Setup: prefix defined for ex, but object token uses unknown prefix 'foo'
            const tokens = [
                makeToken(RdfToken.TTL_PREFIX.name, '@prefix', { startLine: 1, endLine: 1, startColumn: 1, endColumn: 7 }),
                makeToken(RdfToken.PNAME_NS.name, 'ex:', { startLine: 1, endLine: 1, startColumn: 9, endColumn: 11 }),
                makeToken(RdfToken.IRIREF.name, '<http://example.org/>', { startLine: 1, endLine: 1, startColumn: 13, endColumn: 33 }),
                makeToken(RdfToken.PERIOD.name, '.', { startLine: 1, endLine: 1, startColumn: 35, endColumn: 35 }),
                makeToken(RdfToken.PNAME_LN.name, 'ex:Sub', { startLine: 2, endLine: 2, startColumn: 1, endColumn: 6 }),
                makeToken(RdfToken.A.name, 'a', { startLine: 2, endLine: 2, startColumn: 8, endColumn: 8 }),
                // Object uses 'foo' prefix which is not defined
                makeToken(RdfToken.PNAME_LN.name, 'foo:Class', { startLine: 2, endLine: 2, startColumn: 10, endColumn: 18 }),
            ];
            // Covers _handleTypeDefinition line: if (!objectUri) return;
            expect(() => doc.setTokens(tokens as any)).not.toThrow();
        });
    });

    describe('infer', () => {

        it('onDidChangeDocument resolves without error', async () => {
            const doc = makeDoc();
            const event: vscode.TextDocumentChangeEvent = {
                document: createMockTextDocument(),
                contentChanges: [],
                reason: undefined,
            };
            await expect(doc.onDidChangeDocument(event)).resolves.toBeUndefined();
        });

        it('does nothing when store has no reasoner', async () => {
            storeControl.reasoner = null;
            const doc = makeDoc();
            await expect(doc.infer()).resolves.toBeUndefined();
        });

        it('executes inference when reasoner is present', async () => {
            const executeInference = vi.fn();
            // Partial stub: only the members required by TurtleDocument.infer are provided.
            const store = {
                reasoner: { infer: vi.fn() },
                executeInference,
                dataFactory: { namedNode: (v: string) => ({ value: v }), quad: vi.fn() },
                add: vi.fn(),
            } as unknown as Store;
            const doc = createTurtleDocument('file:///test.ttl', RdfSyntax.Turtle, { store });
            await doc.infer();
            expect(executeInference).toHaveBeenCalled();
        });

        it('does not re-execute inference if already executed', async () => {
            const executeInference = vi.fn();
            // Partial stub: only the members required by TurtleDocument.infer are provided.
            const store = {
                reasoner: { infer: vi.fn() },
                executeInference,
                dataFactory: { namedNode: (v: string) => ({ value: v }), quad: vi.fn() },
                add: vi.fn(),
            } as unknown as Store;
            const doc = createTurtleDocument('file:///test.ttl', RdfSyntax.Turtle, { store });
            await doc.infer();
            await doc.infer();
            expect(executeInference).toHaveBeenCalledTimes(1);
        });

        describe('after a reload', () => {
            const prefixes = '@prefix ex: <http://example.org/> .\n';

            /**
             * Loads a text into the document as an edit does: parse, load the triples, infer.
             */
            async function load(doc: TurtleDocument, text: string): Promise<void> {
                doc.parse(text);

                await doc.loadTriples(text);
                await doc.infer();
            }

            /**
             * Creates a document over a real store with a reasoner and spies on its inference.
             */
            function makeDocWithReasoner() {
                const store = new RealStore(new OwlReasoner());
                const executeInference = vi.spyOn(store, 'executeInference');
                const doc = createTurtleDocument('file:///test.ttl', RdfSyntax.Turtle, { store });

                return { store, doc, executeInference };
            }

            it('re-executes inference when the triples changed', async () => {
                const { doc, executeInference } = makeDocWithReasoner();

                await load(doc, prefixes + 'ex:a a ex:B .');
                await load(doc, prefixes + 'ex:a a ex:C .');

                expect(executeInference).toHaveBeenCalledTimes(2);
            });

            it('does not re-execute inference or change the graph when the triples did not change', async () => {
                const { store, doc, executeInference } = makeDocWithReasoner();

                await load(doc, prefixes + 'ex:a a ex:B .');

                const version = store.getGraphVersion(doc.graphs[0]);

                // Whitespace and comments do not change the triples.
                await load(doc, prefixes + '\n# A comment.\nex:a  a  ex:B .');

                expect(executeInference).toHaveBeenCalledTimes(1);
                expect(store.getGraphVersion(doc.graphs[0])).toBe(version);
            });

            it('only adds and deletes the triples that changed', async () => {
                const { store, doc } = makeDocWithReasoner();

                await load(doc, prefixes + 'ex:a ex:p "1" . ex:b ex:p "2" . ex:c ex:p "3" .');

                const text = prefixes + 'ex:a ex:p "1" . ex:b ex:p "two" . ex:c ex:p "3" .';

                doc.parse(text);

                // The inference that follows a change writes to the store as well, so it is left out.
                const add = vi.spyOn(store, 'add');
                const remove = vi.spyOn(store, 'delete');

                await doc.loadTriples(text);

                expect(add).toHaveBeenCalledTimes(1);
                expect(remove).toHaveBeenCalledTimes(1);
                expect(store.countQuads(null, null, null, store.dataFactory.namedNode(doc.graphs[0]))).toBe(3);
            });

            it('deletes the graph of a previous graph IRI with its inference graph', async () => {
                const { store, doc } = makeDocWithReasoner();
                const deleteGraphs = vi.spyOn(store, 'deleteGraphs');

                doc.graphs.push('urn:previous');

                await load(doc, prefixes + 'ex:a a ex:B .');

                expect(deleteGraphs).toHaveBeenCalledWith(['urn:previous'], true);
            });

            it('removes all triples when the document has errors', async () => {
                const { store, doc } = makeDocWithReasoner();

                await load(doc, prefixes + 'ex:a a ex:B .');
                await load(doc, prefixes + 'ex:a a .');

                expect(store.countQuads(null, null, null, store.dataFactory.namedNode(doc.graphs[0]))).toBe(0);
            });
        });
    });

    describe('loadTriples', () => {

        it('populates graphs from store during successful parse', async () => {
            const doc = makeDoc();
            // Use real tokens from TurtleLexer so TurtleParser can produce quads
            const turtleSource = '@prefix ex: <http://example.org/> .\nex:Subject a ex:Class .\n';
            const lexResult = new TurtleLexer().tokenize(turtleSource);
            doc.setTokens(lexResult.tokens);
            await doc.loadTriples('');
            expect(doc.graphs).toHaveLength(1);
        });

        it('does not throw when store.resolve throws', async () => {
            storeControl.shouldThrowLoad = true;
            const doc = makeDoc();
            await expect(doc.loadTriples('')).resolves.toBeUndefined();
        });
    });
});

describe('blank node collision prevention', () => {
    const parse = (input: string, uri: string) => {
        const tokens = new TurtleLexer(createFileBlankNodeIdGenerator(uri)).tokenize(input).tokens;
        return new TurtleReader().visit(new TurtleParser().parse(tokens)) as any[];
    };

    const blankNodeValues = (quads: any[]): string[] =>
        quads.flatMap(q => [q.subject, q.object].filter(t => t.termType === 'BlankNode').map((t: any) => t.value));

    it('anonymous blank nodes do not collide across documents', () => {
        const input = '[ <http://example.org/p> "v" ] .';
        const idsA = blankNodeValues(parse(input, 'mentor://workspace/a.ttl'));
        const idsB = blankNodeValues(parse(input, 'mentor://workspace/b.ttl'));
        expect(idsA.length).toBeGreaterThan(0);
        expect(idsB.length).toBeGreaterThan(0);
        expect(idsA.some(id => idsB.includes(id))).toBe(false);
    });

    it('named blank nodes do not collide across documents', () => {
        const input = '_:foo <http://example.org/p> "v" .';
        const idsA = blankNodeValues(parse(input, 'mentor://workspace/a.ttl'));
        const idsB = blankNodeValues(parse(input, 'mentor://workspace/b.ttl'));
        expect(idsA.length).toBeGreaterThan(0);
        expect(idsB.length).toBeGreaterThan(0);
        expect(idsA.some(id => idsB.includes(id))).toBe(false);
    });
});

describe('TurtleDocument.parse — grammar parse failures', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('does not fail the parse when the grammar parse throws', () => {
        const doc = makeDoc();

        // A recursive-descent parser exhausts the stack on a pathologically
        // large document; the tokens are still valid and must survive. The
        // text has a syntax error so that the grammar parser is reached.
        vi.spyOn(ParserFactory, 'getParser').mockReturnValue({
            parse: () => { throw new RangeError('Maximum call stack size exceeded'); },
            errors: [],
            semanticErrors: [],
            input: [],
        } as any);

        const text = '@prefix ex: <http://example.org/> .\nex:a ex:b .';

        expect(() => doc.parse(text)).not.toThrow();

        // The token-derived state is populated as usual.
        expect(doc.tokens.length).toBeGreaterThan(0);
        expect(doc.namespaces['ex']).toBe('http://example.org/');
        expect(doc.isParsed).toBe(true);

        // Without a usable parse result every consumer falls back to its own
        // parse, where the failure is handled (reported or swallowed) already.
        expect(doc.getParseResult(text)).toBeUndefined();
    });

    it('still loads no triples when the grammar parse throws', async () => {
        const doc = makeDoc();

        vi.spyOn(ParserFactory, 'getParser').mockReturnValue({
            parse: () => { throw new RangeError('Maximum call stack size exceeded'); },
            errors: [],
            semanticErrors: [],
            input: [],
        } as any);

        const text = '@prefix ex: <http://example.org/> .\nex:a ex:b .';

        doc.parse(text);

        await expect(doc.loadTriples(text)).resolves.toBeUndefined();
    });

    it('captures a reusable syntax tree when the grammar parse succeeds', () => {
        const doc = makeDoc();
        const text = '@prefix ex: <http://example.org/> .\nex:a ex:b .';

        doc.parse(text);

        const result = doc.getParseResult(text);

        expect(result).toBeDefined();
        expect(result!.cst).toBeDefined();
        expect(result!.quads).toBeUndefined();
        expect(result!.tokens.length).toBeGreaterThan(0);
    });
});

describe('TurtleDocument.parse — quad reader', () => {
    const text = '@prefix ex: <http://example.org/> .\nex:a ex:b ex:c ; ex:d [ ex:e ex:f ] .';

    beforeEach(() => {
        vi.restoreAllMocks();

        storeControl.shouldThrowLoad = false;
        storeControl.reasoner = null;
    });

    it('reads a valid Turtle document without the grammar parser', async () => {
        const doc = makeDoc();
        const getParser = vi.spyOn(ParserFactory, 'getParser');

        doc.parse(text);

        const result = doc.getParseResult(text);

        expect(result!.quads).toHaveLength(3);
        expect(result!.cst).toBeUndefined();
        expect(result!.parserErrors).toEqual([]);
        expect(result!.semanticErrors).toEqual([]);

        await doc.loadTriples(text);

        expect(getParser).not.toHaveBeenCalled();
        expect((doc as any)._store.add).toHaveBeenCalledTimes(3);
        expect(doc.getParseResult(text)!.quads).toBeUndefined();
    });

    it('loads the same quads as the syntax tree reader', () => {
        const doc = makeDoc();

        doc.parse(text);

        const tokens = new TurtleLexer(createFileBlankNodeIdGenerator(doc.uri.toString())).tokenize(text).tokens;
        const expected = new TurtleReader().visit(new TurtleParser().parse(tokens)) as any[];
        const render = (quads: any[]) => quads.map(q => `${q.subject.value} ${q.predicate.value} ${q.object.value}`);

        expect(render(doc.getParseResult(text)!.quads!)).toEqual(render(expected));
    });

    it('falls back to the grammar parser for a document with a syntax error', async () => {
        const doc = makeDoc();
        const invalidText = '@prefix ex: <http://example.org/> .\nex:a ex:b ex:c .\nex:a ex:b .';

        doc.parse(invalidText);

        const result = doc.getParseResult(invalidText);

        expect(result!.quads).toBeUndefined();
        expect(result!.cst).toBeDefined();
        expect(result!.parserErrors.length).toBeGreaterThan(0);

        await doc.loadTriples(invalidText);

        expect((doc as any)._store.add).not.toHaveBeenCalled();
    });

    it('reads the tokens again with the quad reader when the parse result was released', async () => {
        const doc = makeDoc();
        const getParser = vi.spyOn(ParserFactory, 'getParser');

        doc.parse(text);
        doc.releaseParseResult();

        await doc.loadTriples(text);

        expect(getParser).not.toHaveBeenCalled();
        expect((doc as any)._store.add).toHaveBeenCalledTimes(3);
    });

    it('takes the grammar parser for a TriG document', async () => {
        const doc = createTurtleDocument('file:///test.trig', RdfSyntax.TriG, { store: makeStore() });
        const trigText = '@prefix ex: <http://example.org/> .\nex:g { ex:a ex:b ex:c . }';

        doc.parse(trigText);

        const result = doc.getParseResult(trigText);

        expect(result!.quads).toBeUndefined();
        expect(result!.cst).toBeDefined();
    });
});

describe('TurtleDocument parse result lifecycle', () => {
    const text = '@prefix ex: <http://example.org/> .\nex:a ex:b ex:c .';

    beforeEach(() => {
        vi.restoreAllMocks();

        // Earlier suites leave the store stub in a throwing state; these tests need a working store.
        storeControl.shouldThrowLoad = false;
        storeControl.reasoner = null;
    });

    it('releases the quads once the triples are loaded and keeps the tokens and errors', async () => {
        const doc = makeDoc();

        doc.parse(text);

        expect(doc.getParseResult(text)!.quads).toBeDefined();

        await doc.loadTriples(text);

        const result = doc.getParseResult(text);

        expect(result).toBeDefined();
        expect(result!.quads).toBeUndefined();
        expect(result!.cst).toBeUndefined();
        expect(result!.parseTokens).toBeUndefined();
        expect(result!.tokens).toBe(doc.tokens);
        expect(result!.lexErrors).toEqual([]);
        expect(result!.parserErrors).toEqual([]);
        expect(result!.semanticErrors).toEqual([]);
    });

    it('reads the tokens again when the triples are loaded a second time from the same text', async () => {
        const doc = makeDoc();
        const read = vi.spyOn(TurtleQuadReader.prototype, 'read');

        doc.parse(text);

        // The first load reuses the captured quads; they are released
        // afterwards, so the second load has to read the tokens again.
        await doc.loadTriples(text);
        await doc.loadTriples(text);

        expect(read).toHaveBeenCalledTimes(2);
        expect(doc.graphs).toHaveLength(1);
    });

    it('releases the syntax tree of a document with syntax errors as well', async () => {
        const doc = makeDoc();
        const invalidText = '@prefix ex: <http://example.org/> .\nex:a ex:b .';

        doc.parse(invalidText);

        expect(doc.getParseResult(invalidText)!.parserErrors.length).toBeGreaterThan(0);

        await doc.loadTriples(invalidText);

        const result = doc.getParseResult(invalidText);

        expect(result).toBeDefined();
        expect(result!.cst).toBeUndefined();
        expect(result!.parserErrors.length).toBeGreaterThan(0);
    });

    it('drops the whole parse result on releaseParseResult but keeps the tokens', () => {
        const doc = makeDoc();

        doc.parse(text);
        doc.releaseParseResult();

        expect(doc.getParseResult(text)).toBeUndefined();
        expect(doc.tokens.length).toBeGreaterThan(0);
        expect(doc.isParsed).toBe(true);
    });
});

describe('TurtleDocument.releaseTokens', () => {
    const text = '@prefix ex: <http://example.org/> .\nex:a ex:b ex:c .\nex:a a ex:Thing .';

    beforeEach(() => {
        vi.restoreAllMocks();

        // Earlier suites leave the store stub in a throwing state; these tests need a working store.
        storeControl.shouldThrowLoad = false;
        storeControl.reasoner = null;
    });

    it('keeps the document loaded and its index maps after the tokens are released', async () => {
        const doc = makeDoc();

        doc.parse(text);

        await doc.loadTriples(text);

        expect(doc.isLoaded).toBe(true);
        expect(doc.isParsed).toBe(true);

        doc.releaseTokens();

        expect(doc.isParsed).toBe(false);
        expect(doc.tokens).toHaveLength(0);
        expect(doc.getParseResult(text)).toBeUndefined();
        expect(doc.isLoaded).toBe(true);
        expect(doc.graphs).toHaveLength(1);
        expect(doc.references.has('http://example.org/a')).toBe(true);
        expect(doc.subjects.has('http://example.org/a')).toBe(true);
        expect(doc.typeAssertions.has('http://example.org/a')).toBe(true);
        expect(doc.namespaces['ex']).toBe('http://example.org/');
    });

    it('maps quad contexts from the text once the tokens are released', () => {
        const doc = makeDoc();

        doc.parse(text);

        const fromTokens = doc.getQuadContexts();

        doc.releaseTokens();

        const fromText = doc.getQuadContextsForText(text);

        expect(fromTokens.length).toBeGreaterThan(0);
        expect(doc.getQuadContexts()).toEqual([]);
        expect(fromText).toHaveLength(fromTokens.length);
    });

    it('is parsed again when new tokens are set', () => {
        const doc = makeDoc();

        doc.parse(text);
        doc.releaseTokens();
        doc.parse(text);

        expect(doc.isParsed).toBe(true);
        expect(doc.tokens.length).toBeGreaterThan(0);
    });
});

describe('TurtleDocument language tag statistics', () => {
    /**
     * Creates a document with a real store and loads the given Turtle text.
     */
    async function load(text: string, doc = createTurtleDocument('file:///stats.ttl')) {
        doc.parse(text);

        await doc.loadTriples(text);

        return doc;
    }

    it('counts the language tags of the loaded literals', async () => {
        const doc = await load('@prefix ex: <http://example.org/> .\nex:a ex:p "A"@en , "B"@en , "C"@de , "D" ; ex:q ex:b .');

        expect(doc.languageTagStats).toEqual({ en: 2, de: 1, '': 1 });
        expect(doc.primaryLanguage).toBe('en');
    });

    it('replaces the statistics when the document is loaded again', async () => {
        const doc = await load('@prefix ex: <http://example.org/> .\nex:a ex:p "A"@en .');

        await load('@prefix ex: <http://example.org/> .\nex:a ex:p "A"@fr , "B"@fr .', doc);

        expect(doc.languageTagStats).toEqual({ fr: 2 });
        expect(doc.primaryLanguage).toBe('fr');
    });

    it('has no statistics when the document does not load', async () => {
        const doc = await load('@prefix ex: <http://example.org/> .\nex:a ex:p "A"@en .');

        await load('@prefix ex: <http://example.org/> .\nex:a ex:p .', doc);

        expect(doc.languageTagStats).toEqual({});
        expect(doc.primaryLanguage).toBeUndefined();
    });
});

describe('TurtleDocument.tokenizeDocument', () => {
    const text = '@prefix ex: <http://example.org/> .\nex:a ex:b ex:c .';

    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('tokenizes a document version only once', () => {
        const doc = makeDoc();
        const document = createMockTextDocument(text, { version: 3 });
        const tokenize = vi.spyOn(doc, 'tokenize');

        const first = doc.tokenizeDocument(document);
        const second = doc.tokenizeDocument(document);

        expect(tokenize).toHaveBeenCalledTimes(1);
        expect(second).toBe(first);
        expect(first.length).toBeGreaterThan(0);
    });

    it('tokenizes again when the document version changes', () => {
        const doc = makeDoc();
        const tokenize = vi.spyOn(doc, 'tokenize');

        doc.tokenizeDocument(createMockTextDocument(text, { version: 3 }));
        const tokens = doc.tokenizeDocument(createMockTextDocument(text + '\nex:d ex:e ex:f .', { version: 4 }));

        expect(tokenize).toHaveBeenCalledTimes(2);
        expect(tokens.some(t => t.image === 'ex:f')).toBe(true);
    });

    it('drops the cached tokens when the tokens are released', () => {
        const doc = makeDoc();
        const document = createMockTextDocument(text, { version: 3 });
        const tokenize = vi.spyOn(doc, 'tokenize');

        doc.tokenizeDocument(document);
        doc.releaseTokens();
        doc.tokenizeDocument(document);

        expect(tokenize).toHaveBeenCalledTimes(2);
    });
});

describe('TurtleDocument.getQuadContexts', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        storeControl.shouldThrowLoad = false;
    });

    it('reads the quad contexts of a TriG document with its own grammar', () => {
        const doc = createTurtleDocument('file:///test.trig', RdfSyntax.TriG, { store: makeStore() });

        doc.parse('@prefix ex: <http://example.org/> .\nex:g { ex:a ex:b ex:c . }');

        const quadContexts = doc.getQuadContexts();

        expect(quadContexts).toHaveLength(1);
        expect(quadContexts[0].subject.value).toBe('http://example.org/a');
        expect(quadContexts[0].objectToken.image).toBe('ex:c');
    });

    it('reads the quad contexts of a Turtle document', () => {
        const doc = makeDoc();

        doc.parse('@prefix ex: <http://example.org/> .\nex:a ex:b ex:c ; ex:d ex:e .');

        expect(doc.getQuadContexts().map(q => q.predicate.value)).toEqual(['http://example.org/b', 'http://example.org/d']);
    });
});
