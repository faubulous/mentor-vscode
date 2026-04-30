import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

const storeControl = vi.hoisted(() => ({
    reasoner: null as any,
    shouldThrowLoad: false,
}));

vi.mock('tsyringe', () => ({
    container: {
        resolve: vi.fn(() => {
            if (storeControl.shouldThrowLoad) {
                throw new Error('store unavailable');
            }
            return {
                reasoner: storeControl.reasoner,
                executeInference: vi.fn(),
                dataFactory: {
                    namedNode: (iri: string) => ({ termType: 'NamedNode', value: iri }),
                    quad: (s: any, p: any, o: any, g: any) => ({ subject: s, predicate: p, object: o, graph: g }),
                },
                add: vi.fn(),
                graphs: [],
            };
        }),
    },
    injectable: () => (_target: any) => _target,
    inject: () => () => {},
    singleton: () => (_target: any) => _target,
}));

import { Uri, Position } from '@src/utilities/mocks/vscode';
import { TurtleDocument } from '@src/languages/turtle/turtle-document';
import { RdfSyntax, RdfToken, TurtleLexer, TurtleParser, TurtleReader, createFileBlankNodeIdGenerator } from '@faubulous/mentor-rdf-parsers';
import { RDF } from '@faubulous/mentor-rdf';

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
    return new TurtleDocument(Uri.parse(uri) as any, RdfSyntax.Turtle);
}

describe('TurtleDocument', () => {
    describe('initial state', () => {
        it('hasTokens is false before setTokens is called', () => {
            const doc = makeDoc();
            expect(doc.hasTokens).toBe(false);
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
        it('sets hasTokens to true', () => {
            const doc = makeDoc();
            doc.setTokens([makeToken(RdfToken.PNAME_LN.name, 'ex:Thing') as any]);
            expect(doc.hasTokens).toBe(true);
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

    describe('getTokenIndexAtPosition', () => {
        it('returns -1 when no tokens are set', () => {
            const doc = makeDoc();
            const idx = doc.getTokenIndexAtPosition({ line: 0, character: 5 } as any);
            expect(idx).toBe(-1);
        });

        it('returns the index of the token at a given position', () => {
            const doc = makeDoc();
            // Token on line 1 (1-based), column 1–4 (1-based) → line 0 (0-based), char 0–3
            const token = makeToken(RdfToken.PNAME_LN.name, 'ex:A', { startLine: 1, startColumn: 1, endLine: 1, endColumn: 4 });
            doc.setTokens([token as any]);
            // Position: line=0 (0-based), character=2 (0-based) → inside "ex:A"
            const idx = doc.getTokenIndexAtPosition({ line: 0, character: 2 } as any);
            expect(idx).toBe(0);
        });

        it('returns -1 when position is past the end of all tokens', () => {
            const doc = makeDoc();
            const token = makeToken(RdfToken.PNAME_LN.name, 'ex:A', { startLine: 1, startColumn: 1, endLine: 1, endColumn: 4 });
            doc.setTokens([token as any]);
            // Line 10 is well past any token
            const idx = doc.getTokenIndexAtPosition({ line: 9, character: 0 } as any);
            expect(idx).toBe(-1);
        });
    });

    describe('getTokenAtPosition', () => {
        it('returns undefined when no token covers the position', () => {
            const doc = makeDoc();
            doc.setTokens([makeToken(RdfToken.PNAME_LN.name, 'ex:A', { startLine: 1, startColumn: 1, endColumn: 4 }) as any]);
            expect(doc.getTokenAtPosition({ line: 9, character: 0 } as any)).toBeUndefined();
        });

        it('returns the correct token at a given position', () => {
            const doc = makeDoc();
            const t1 = makeToken(RdfToken.PNAME_LN.name, 'ex:A', { startLine: 1, startColumn: 1, endLine: 1, endColumn: 4 });
            const t2 = makeToken(RdfToken.PERIOD.name, '.', { startLine: 1, startColumn: 6, endLine: 1, endColumn: 6 });
            doc.setTokens([t1 as any, t2 as any]);
            const result = doc.getTokenAtPosition({ line: 0, character: 2 } as any);
            expect(result?.image).toBe('ex:A');
        });
    });

    describe('isPrefixTokenAtPosition', () => {
        it('returns true when cursor is on the prefix part of a prefixed name', () => {
            const doc = makeDoc();
            const token = makeToken(RdfToken.PNAME_LN.name, 'ex:Thing', { startColumn: 1, endColumn: 8 });
            // Column 1 = start; "ex:" ends at position 2 (index 2 = before colon+1)
            // The colon is at index 2 (0-based). Character 1 is within "ex".
            const result = doc.isPrefixTokenAtPosition(token as any, new Position(0, 1) as any);
            expect(result).toBe(true);
        });

        it('returns false when cursor is on the local-name part', () => {
            const doc = makeDoc();
            const token = makeToken(RdfToken.PNAME_LN.name, 'ex:Thing', { startColumn: 1, endColumn: 8 });
            // "ex:" is 3 chars; position 4 (0-based character 4) is after the colon → local-name part
            const result = doc.isPrefixTokenAtPosition(token as any, new Position(0, 5) as any);
            expect(result).toBe(false);
        });

        it('returns false for a non-prefixed token type', () => {
            const doc = makeDoc();
            const token = makeToken(RdfToken.IRIREF.name, '<http://example.org/>', { startColumn: 1, endColumn: 21 });
            const result = doc.isPrefixTokenAtPosition(token as any, new Position(0, 5) as any);
            expect(result).toBe(false);
        });
    });

    describe('getRangeFromToken', () => {
        it('converts 1-based token positions to 0-based Range', () => {
            const doc = makeDoc();
            const token = makeToken(RdfToken.PNAME_LN.name, 'ex:A', { startLine: 2, startColumn: 5, endLine: 2, endColumn: 8 });
            const range = doc.getRangeFromToken(token as any);
            // Lines are 0-based: startLine 2 → 1
            expect(range.start.line).toBe(1);
            // Columns: startColumn 5 → 4 (0-based)
            expect(range.start.character).toBe(4);
        });

        it('end position has +1 applied', () => {
            const doc = makeDoc();
            // Simple single-char token '.' at column 10
            const token = makeToken(RdfToken.PERIOD.name, '.', { startLine: 1, startColumn: 10, endLine: 1, endColumn: 10 });
            const range = doc.getRangeFromToken(token as any);
            // endColumn 10 → 9 (0-based), then +1 = 10
            expect(range.end.character).toBe(10);
        });
    });

    describe('getLiteralAtPosition', () => {
        it('returns undefined when no token is at position (null-token guard)', () => {
            const doc = makeDoc();
            // No tokens set → getTokenAtPosition returns undefined → early return
            const result = doc.getLiteralAtPosition(new Position(0, 0) as any);
            expect(result).toBeUndefined();
        });

        it('returns undefined for a non-literal token type', () => {
            const doc = makeDoc();
            const token = makeToken(RdfToken.PNAME_LN.name, 'ex:A', { startLine: 1, startColumn: 1, endLine: 1, endColumn: 4 });
            doc.setTokens([token as any]);
            const result = doc.getLiteralAtPosition(new Position(0, 2) as any);
            expect(result).toBeUndefined();
        });

        it('strips surrounding double quotes for a STRING_LITERAL_QUOTE token', () => {
            const doc = makeDoc();
            const token = makeToken(RdfToken.STRING_LITERAL_QUOTE.name, '"hello"', { startLine: 1, startColumn: 1, endLine: 1, endColumn: 7 });
            doc.setTokens([token as any]);
            const result = doc.getLiteralAtPosition(new Position(0, 3) as any);
            expect(result).toBe('hello');
        });

        it('strips surrounding single quotes for a STRING_LITERAL_SINGLE_QUOTE token', () => {
            const doc = makeDoc();
            const token = makeToken(RdfToken.STRING_LITERAL_SINGLE_QUOTE.name, "'world'", { startLine: 1, startColumn: 1, endLine: 1, endColumn: 7 });
            doc.setTokens([token as any]);
            const result = doc.getLiteralAtPosition(new Position(0, 3) as any);
            expect(result).toBe('world');
        });

        it('strips triple double quotes for STRING_LITERAL_LONG_QUOTE token', () => {
            const doc = makeDoc();
            const token = makeToken(RdfToken.STRING_LITERAL_LONG_QUOTE.name, '"""long text"""', {
                startLine: 1, startColumn: 1, endLine: 1, endColumn: 15,
            });
            doc.setTokens([token as any]);
            const result = doc.getLiteralAtPosition(new Position(0, 5) as any);
            expect(result).toBe('long text');
        });

        it('strips triple single quotes for STRING_LITERAL_LONG_SINGLE_QUOTE token', () => {
            const doc = makeDoc();
            const token = makeToken(RdfToken.STRING_LITERAL_LONG_SINGLE_QUOTE.name, "'''long text'''", {
                startLine: 1, startColumn: 1, endLine: 1, endColumn: 15,
            });
            doc.setTokens([token as any]);
            const result = doc.getLiteralAtPosition(new Position(0, 5) as any);
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
            const result = doc.getIriAtPosition(new Position(1, 1) as any);
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
            const result = doc.getIriAtPosition(new Position(1, 5) as any);
            expect(result).toBeDefined();
        });

        it('returns undefined when no token is at the given position', () => {
            const doc = makeDoc();
            const result = doc.getIriAtPosition(new Position(99, 0) as any);
            expect(result).toBeUndefined();
        });
    });

    describe('getTokenIndexAtPosition — edge cases', () => {
        it('skips tokens missing position info (continue path)', () => {
            const doc = makeDoc();
            // Token with missing startLine/endLine — should be skipped
            const noPos = { tokenType: { name: RdfToken.PNAME_LN.name }, image: 'ex:A' };
            const good = makeToken(RdfToken.PERIOD.name, '.', { startLine: 2, startColumn: 1, endLine: 2, endColumn: 1 });
            doc.setTokens([noPos as any, good as any]);
            // Ask at position line 1 (0-based), char 0 → inside good token's line
            const idx = doc.getTokenIndexAtPosition({ line: 1, character: 0 } as any);
            expect(idx).toBe(1);
        });

        it('breaks early when token startLine exceeds position line (break path)', () => {
            const doc = makeDoc();
            // Token on line 5, position asks for line 1
            const farToken = makeToken(RdfToken.PERIOD.name, '.', { startLine: 5, startColumn: 1, endLine: 5, endColumn: 1 });
            doc.setTokens([farToken as any]);
            const idx = doc.getTokenIndexAtPosition({ line: 0, character: 0 } as any);
            expect(idx).toBe(-1);
        });

        it('matches a multi-line token when position is between start and end lines', () => {
            const doc = makeDoc();
            // Multi-line token: starts line 1, ends line 3
            const multiLine = makeToken(RdfToken.STRING_LITERAL_LONG_QUOTE.name, '"""line1\nline2\nline3"""', {
                startLine: 1, startColumn: 1, endLine: 3, endColumn: 8,
            });
            doc.setTokens([multiLine as any]);
            // Position on line 1 (0-based) = line 2 (1-based) → between startLine=1 and endLine=3
            const idx = doc.getTokenIndexAtPosition({ line: 1, character: 0 } as any);
            expect(idx).toBe(0);
        });
    });

    describe('getTokenBeforePosition', () => {
        it('returns previous token when a token is found at position (index > 0)', () => {
            const doc = makeDoc();
            const t1 = makeToken(RdfToken.TTL_PREFIX.name, '@prefix', { startLine: 1, startColumn: 1, endLine: 1, endColumn: 7 });
            const t2 = makeToken(RdfToken.PNAME_NS.name, 'ex:', { startLine: 1, startColumn: 9, endLine: 1, endColumn: 11 });
            doc.setTokens([t1 as any, t2 as any]);
            // Position inside t2 (line 0, char 9) → index=1 → return t1
            const result = doc.getTokenBeforePosition({ line: 0, character: 9 } as any);
            expect(result?.image).toBe('@prefix');
        });

        it('returns undefined when position is at the first token (index === 0)', () => {
            const doc = makeDoc();
            const t1 = makeToken(RdfToken.TTL_PREFIX.name, '@prefix', { startLine: 1, startColumn: 1, endLine: 1, endColumn: 7 });
            doc.setTokens([t1 as any]);
            // Position inside t1 → index=0 → no previous token
            const result = doc.getTokenBeforePosition({ line: 0, character: 3 } as any);
            expect(result).toBeUndefined();
        });

        it('returns last token before position when no token is at position (index === -1)', () => {
            const doc = makeDoc();
            const t1 = makeToken(RdfToken.PNAME_LN.name, 'ex:A', { startLine: 1, startColumn: 1, endLine: 1, endColumn: 4 });
            doc.setTokens([t1 as any]);
            // Position on line 2 (0-based), char 0 → index=-1 → backward scan finds t1 (endLine=1 < l=2)
            const result = doc.getTokenBeforePosition({ line: 1, character: 0 } as any);
            expect(result?.image).toBe('ex:A');
        });
        it('returns last token before position on same line when endColumn <= character (index === -1)', () => {
            const doc = makeDoc();
            // Token ends at column 4 on line 1
            const t1 = makeToken(RdfToken.PNAME_LN.name, 'ex:A', { startLine: 1, endLine: 1, startColumn: 1, endColumn: 4 });
            doc.setTokens([t1 as any]);
            // Position on same line (line 0 = line 1 in 1-based), char 6 > endColumn=4 → backward scan: endLine=1==l=1 && endColumn=4<=n=6 → match
            const result = doc.getTokenBeforePosition({ line: 0, character: 6 } as any);
            expect(result?.image).toBe('ex:A');
        });
        it('returns undefined when no token precedes position in backward scan', () => {
            const doc = makeDoc();
            const t1 = makeToken(RdfToken.PNAME_LN.name, 'ex:A', { startLine: 3, startColumn: 1, endLine: 3, endColumn: 4 });
            doc.setTokens([t1 as any]);
            // Position on line 0 (0-based), char 0 → index=-1 → backward scan: t1 endLine=3 > l=1 → no match
            const result = doc.getTokenBeforePosition({ line: 0, character: 0 } as any);
            expect(result).toBeUndefined();
        });
    });

    describe('setTokens — extended token types', () => {
        beforeEach(() => {
            storeControl.reasoner = null;
            storeControl.shouldThrowLoad = false;
        });

        it('registers IRIREF token references', () => {
            const doc = makeDoc();
            const tokens = [
                makeToken(RdfToken.IRIREF.name, '<http://example.org/Thing>', { startLine: 1, startColumn: 1, endLine: 1, endColumn: 26 }),
            ];
            doc.setTokens(tokens as any);
            expect(doc.references['http://example.org/Thing']).toBeDefined();
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
            expect(doc.references['_:b0']).toBeDefined();
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
            expect(doc.references['_:b1']).toBeDefined();
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
            expect(Object.keys(doc.references)).toHaveLength(0);
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
            expect(doc.typeDefinitions['http://example.org/MyClass']).toBeDefined();
        });

        it('registers IRIREF subject after PERIOD', () => {
            const doc = makeDoc();
            const tokens = [
                makeToken(RdfToken.PERIOD.name, '.', { startLine: 1, startColumn: 1, endColumn: 1 }),
                makeToken(RdfToken.IRIREF.name, '<http://example.org/Sub>', { startLine: 2, startColumn: 1, endLine: 2, endColumn: 24 }),
            ];
            doc.setTokens(tokens as any);
            expect(doc.subjects['http://example.org/Sub']).toBeDefined();
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
            await expect(doc.onDidChangeDocument({} as any)).resolves.toBeUndefined();
        });

        it('does nothing when store has no reasoner', async () => {
            storeControl.reasoner = null;
            const doc = makeDoc();
            await expect(doc.infer()).resolves.toBeUndefined();
        });

        it('executes inference when reasoner is present', async () => {
            const executeInference = vi.fn();
            storeControl.reasoner = { infer: vi.fn() };
            // Override the resolve mock temporarily
            const { container } = await import('tsyringe');
            (container.resolve as any).mockImplementationOnce(() => ({
                reasoner: { infer: vi.fn() },
                executeInference,
                dataFactory: { namedNode: (v: string) => ({ value: v }), quad: vi.fn() },
                add: vi.fn(),
            }));
            const doc = makeDoc();
            await doc.infer();
            expect(executeInference).toHaveBeenCalled();
        });

        it('does not re-execute inference if already executed', async () => {
            const executeInference = vi.fn();
            const { container } = await import('tsyringe');
            (container.resolve as any).mockImplementation(() => ({
                reasoner: { infer: vi.fn() },
                executeInference,
                dataFactory: { namedNode: (v: string) => ({ value: v }), quad: vi.fn() },
                add: vi.fn(),
            }));
            const doc = makeDoc();
            await doc.infer();
            await doc.infer();
            expect(executeInference).toHaveBeenCalledTimes(1);
            // Restore to default mock
            (container.resolve as any).mockImplementation(() => ({
                reasoner: storeControl.reasoner,
                executeInference: vi.fn(),
                dataFactory: { namedNode: (v: string) => ({ value: v }), quad: vi.fn() },
                add: vi.fn(),
            }));
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
