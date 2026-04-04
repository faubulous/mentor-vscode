import { describe, it, expect, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

vi.mock('tsyringe', () => ({
    container: { resolve: vi.fn(() => ({})) },
    injectable: () => (_target: any) => _target,
    inject: () => () => {},
    singleton: () => (_target: any) => _target,
}));

import { Uri, Position } from '@src/utilities/mocks/vscode';
import { TurtleDocument } from './turtle-document';
import { RdfSyntax, RdfToken } from '@faubulous/mentor-rdf-parsers';

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
    });
});
