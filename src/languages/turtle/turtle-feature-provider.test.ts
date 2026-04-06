import { describe, it, expect, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));
vi.mock('@faubulous/mentor-rdf-serializers', () => ({}));

vi.mock('@faubulous/mentor-rdf', () => ({
	Uri: {
		getNamespaceIri: (iri: string) => {
			// Simple namespace: everything up to and including the last '#' or '/'
			const hashIdx = iri.lastIndexOf('#');
			const slashIdx = iri.lastIndexOf('/');
			const idx = Math.max(hashIdx, slashIdx);
			return idx >= 0 ? iri.substring(0, idx + 1) : iri;
		},
	},
}));

import { Position, Range } from '@src/utilities/mocks/vscode';
import { RdfToken } from '@faubulous/mentor-rdf-parsers';
import { TurtleFeatureProvider } from './turtle-feature-provider';

/** Expose protected methods for testing */
class TestableProvider extends TurtleFeatureProvider {
	getPrefixEditRangePublic(token: any) {
		return this.getPrefixEditRange(token);
	}
	getLabelEditRangePublic(token: any) {
		return this.getLabelEditRange(token);
	}
}

function makeToken(name: string, image: string, startLine = 1, startColumn = 1) {
	const endColumn = startColumn + image.length - 1;
	return {
		tokenType: { name },
		image,
		startLine,
		startColumn,
		endLine: startLine,
		endColumn,
		startOffset: 0,
		endOffset: image.length - 1,
	};
}

describe('TurtleFeatureProvider', () => {
	let provider: TestableProvider;

	beforeEach(() => {
		provider = new TestableProvider();
	});

	describe('getPrefixEditRange', () => {
		it('returns range for PNAME_NS token', () => {
			const token = makeToken(RdfToken.PNAME_NS.name, 'ex:', 3, 5);
			const range = provider.getPrefixEditRangePublic(token);
			expect(range).not.toBeNull();
			// Line is 0-based (startLine 3 → line 2), character 0-based (col 5 → char 4)
			expect((range as any).start.line).toBe(2);
			expect((range as any).start.character).toBe(4);
		});

		it('returns range for PNAME_LN token', () => {
			const token = makeToken(RdfToken.PNAME_LN.name, 'ex:Thing', 1, 1);
			const range = provider.getPrefixEditRangePublic(token);
			expect(range).not.toBeNull();
			// prefix is 'ex' (before ':'), so end is start + 2
			const r = range as any;
			expect(r.start.character).toBe(0);
			expect(r.end.character).toBe(2);
		});

		it('returns null for unrecognised token type', () => {
			const token = makeToken('IRIREF', '<http://example.org/>', 1, 1);
			const range = provider.getPrefixEditRangePublic(token);
			expect(range).toBeNull();
		});
	});

	describe('getLabelEditRange', () => {
		it('returns localName range for PNAME_LN token', () => {
			const token = makeToken(RdfToken.PNAME_LN.name, 'ex:Thing', 2, 3);
			const range = provider.getLabelEditRangePublic(token);
			expect(range).not.toBeNull();
			// character for localName starts after ':' → col_0based(3-1=2) + indexOf(':') + 1
			// startColumn=3 → 0-based char=2; ':' at index 2 → localName start char = 2+2+1 = 5
			const r = range as any;
			expect(r.start.character).toBe(5); // 2(0-based col) + 2(colon index) + 1
		});

		it('returns IRI label range for IRIREF token', () => {
			// IRI '<http://example.org/Thing>'
			const image = '<http://example.org/Thing>';
			const token = makeToken(RdfToken.IRIREF.name, image, 1, 1);
			const range = provider.getLabelEditRangePublic(token);
			expect(range).not.toBeNull();
			// namespace = 'http://example.org/', label = 'Thing'
			const r = range as any;
			expect(r.start.character).toBeGreaterThanOrEqual(0);
		});

		it('returns variable name range for VAR1 token (skips leading ?)', () => {
			const token = makeToken(RdfToken.VAR1.name, '?myVar', 1, 1);
			const range = provider.getLabelEditRangePublic(token);
			expect(range).not.toBeNull();
			const r = range as any;
			// start skips '?' → char = 0+1 = 1
			expect(r.start.character).toBe(1);
		});

		it('returns null for unrecognised token type', () => {
			const token = makeToken('PNAME_NS', 'ex:', 1, 1);
			const range = provider.getLabelEditRangePublic(token);
			expect(range).toBeNull();
		});
	});
});
