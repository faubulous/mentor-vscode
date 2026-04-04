import { describe, it, expect, vi } from 'vitest';
import { RdfToken } from '@faubulous/mentor-rdf-parsers';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

// Import after mocks are set up
import { TurtleFeatureProvider } from '../turtle-feature-provider';

/**
 * Creates a minimal fake IToken for testing.
 */
function makeToken(name: string, image: string, startLine = 1, startColumn = 1, endLine?: number, endColumn?: number) {
    const endL = endLine ?? startLine;
    const endC = endColumn ?? (startColumn + image.length);
    return {
        tokenType: { name },
        image,
        startLine,
        startColumn,
        endLine: endL,
        endColumn: endC,
        startOffset: 0,
        endOffset: image.length,
    };
}

// Expose protected methods for testing via subclass
class TestableFeatureProvider extends TurtleFeatureProvider {
    public testGetPrefixEditRange(token: any) {
        return this.getPrefixEditRange(token);
    }

    public testGetLabelEditRange(token: any) {
        return this.getLabelEditRange(token);
    }
}

describe('TurtleFeatureProvider', () => {
    const provider = new TestableFeatureProvider();

    describe('getPrefixEditRange', () => {
        it('returns range for PNAME_NS token (prefix only, e.g. "rdf:")', () => {
            const token = makeToken(RdfToken.PNAME_NS.name, 'rdf:', 1, 1);
            const range = provider.testGetPrefixEditRange(token);
            expect(range).not.toBeNull();
            // Range should cover just "rdf" (before the colon)
            expect(range!.start.line).toBe(0);
            expect(range!.start.character).toBe(0);
            expect(range!.end.character).toBe(3); // length of "rdf"
        });

        it('returns range for PNAME_LN token (prefixed name, e.g. "rdf:type")', () => {
            const token = makeToken(RdfToken.PNAME_LN.name, 'rdf:type', 2, 5);
            const range = provider.testGetPrefixEditRange(token);
            expect(range).not.toBeNull();
            // "rdf" is at column 5-1=4 (0-indexed), ending at 4+3=7
            expect(range!.start.line).toBe(1); // line 2 becomes 0-indexed 1
            expect(range!.start.character).toBe(4); // column 5 becomes 0-indexed 4
            expect(range!.end.character).toBe(7); // 4 + 3 (length of "rdf")
        });

        it('returns null for non-prefix token types', () => {
            const token = makeToken(RdfToken.IRIREF.name, '<http://example.org/>', 1, 1);
            const range = provider.testGetPrefixEditRange(token);
            expect(range).toBeNull();
        });

        it('returns null for VAR1 token type', () => {
            const token = makeToken(RdfToken.VAR1.name, '?x', 1, 1);
            const range = provider.testGetPrefixEditRange(token);
            expect(range).toBeNull();
        });
    });

    describe('getLabelEditRange', () => {
        it('returns range for PNAME_LN token covering local name', () => {
            // "rdf:type" at line 1 col 1 — label range should cover "type" (after the colon)
            const token = makeToken(RdfToken.PNAME_LN.name, 'rdf:type', 1, 1);
            const range = provider.testGetLabelEditRange(token);
            expect(range).not.toBeNull();
            // The local name starts after "rdf:" = character 4
            expect(range!.start.character).toBe(4);
            expect(range!.end.character).toBe(9); // endColumn = startColumn (1) + image.length (8) = 9
        });

        it('returns range for IRIREF token covering just the local name', () => {
            // "<http://example.org/foo>" — local name is "foo"
            const iri = '<http://example.org/foo>';
            const token = makeToken(RdfToken.IRIREF.name, iri, 1, 1, 1, iri.length);
            const range = provider.testGetLabelEditRange(token);
            expect(range).not.toBeNull();
            // "foo" starts at index 20 within "<http://example.org/foo>"
            // '<' is at 0, 'http://example.org/' occupies 1..19, 'foo' starts at 20
            expect(range!.start.character).toBe(20);
            expect(range!.end.character).toBe(23); // 20 + 3 = 23
        });

        it('returns range for VAR1 token excluding the leading ?', () => {
            // "?myVar" — label range should cover "myVar" (skipping the '?')
            const token = makeToken(RdfToken.VAR1.name, '?myVar', 3, 10);
            const range = provider.testGetLabelEditRange(token);
            expect(range).not.toBeNull();
            // line 3 → 0-indexed 2, col 10 → 0-indexed 9
            // Start is at char 10 (9+1 to skip '?')
            expect(range!.start.line).toBe(2);
            expect(range!.start.character).toBe(10);
        });

        it('returns null for PNAME_NS token (prefix-only, no local name)', () => {
            const token = makeToken(RdfToken.PNAME_NS.name, 'rdf:', 1, 1);
            const range = provider.testGetLabelEditRange(token);
            expect(range).toBeNull();
        });

        it('returns null for unknown token types', () => {
            const token = makeToken('UNKNOWN', 'foo', 1, 1);
            const range = provider.testGetLabelEditRange(token);
            expect(range).toBeNull();
        });

        it('handles IRIREF with empty local name (namespace IRI)', () => {
            // "<http://example.org/>" — no local name
            const iri = '<http://example.org/>';
            const token = makeToken(RdfToken.IRIREF.name, iri, 1, 1, 1, iri.length);
            // When namespace == full URI (no local name), the result may be null or an empty range
            const range = provider.testGetLabelEditRange(token);
            // The important thing is it doesn't throw
            expect(() => provider.testGetLabelEditRange(token)).not.toThrow();
        });
    });
});
