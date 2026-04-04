import { describe, it, expect, vi } from 'vitest';

vi.mock('@faubulous/mentor-rdf-parsers', () => ({
	RdfToken: {
		IRIREF:    { name: 'IRIREF' },
		PNAME_LN:  { name: 'PNAME_LN' },
		PNAME_NS:  { name: 'PNAME_NS' },
		PREFIX:    { name: 'PREFIX' },
		TTL_PREFIX:{ name: 'TTL_PREFIX' },
		PERIOD:    { name: 'PERIOD' },
		SEMICOLON: { name: 'SEMICOLON' },
		A:         { name: 'A' },
		LBRACKET:  { name: 'LBRACKET' },
	},
}));

import {
	getTokenPosition,
	getIriFromIriReference,
	getIriFromToken,
	getIriFromPrefixedName,
	getNamespaceIriFromPrefixedName,
	getNamespaceDefinition,
	getTripleComponentType,
} from './tokens';

function makeToken(typeName: string, image: string, startLine = 1, startColumn = 1, endLine = 1, endColumn = 10, payload?: any): any {
	return { tokenType: { name: typeName }, image, startLine, startColumn, endLine, endColumn, payload };
}

describe('getTokenPosition', () => {
	it('converts 1-based token line/column to 0-based Range', () => {
		const token = makeToken('IRIREF', '<http://example.org/>', 3, 5, 3, 28);
		const range = getTokenPosition(token);
		expect(range.start).toEqual({ line: 2, character: 4 });
		expect(range.end).toEqual({ line: 2, character: 28 });
	});

	it('defaults line and character to 0 when token fields are absent', () => {
		const token = { tokenType: { name: 'IRIREF' }, image: '' };
		const range = getTokenPosition(token as any);
		expect(range.start).toEqual({ line: 0, character: 0 });
		expect(range.end).toEqual({ line: 0, character: 0 });
	});
});

describe('getIriFromIriReference', () => {
	it('strips surrounding angle brackets', () => {
		expect(getIriFromIriReference('<http://example.org/Thing>')).toBe('http://example.org/Thing');
	});

	it('returns the value unchanged when no angle brackets are present', () => {
		expect(getIriFromIriReference('http://example.org/Thing')).toBe('http://example.org/Thing');
	});

	it('trims whitespace before processing', () => {
		expect(getIriFromIriReference('  <http://example.org/>  ')).toBe('http://example.org/');
	});

	it('returns the value unchanged for a single angle bracket', () => {
		expect(getIriFromIriReference('<only-open')).toBe('<only-open');
	});

	it('handles an empty angle-bracket pair', () => {
		expect(getIriFromIriReference('<>')).toBe('');
	});
});

describe('getIriFromToken', () => {
	const prefixes = { ex: 'http://example.org/', owl: 'http://www.w3.org/2002/07/owl#' };

	it('extracts IRI from an IRIREF token', () => {
		const token = makeToken('IRIREF', '<http://example.org/Thing>');
		expect(getIriFromToken(prefixes, token)).toBe('http://example.org/Thing');
	});

	it('expands a PNAME_LN token using the prefix map', () => {
		const token = makeToken('PNAME_LN', 'ex:Thing');
		expect(getIriFromToken(prefixes, token)).toBe('http://example.org/Thing');
	});

	it('expands a PNAME_NS token using the prefix map', () => {
		const token = makeToken('PNAME_NS', 'owl:');
		expect(getIriFromToken(prefixes, token)).toBe('http://www.w3.org/2002/07/owl#');
	});

	it('returns the blank node ID from token payload', () => {
		const token = { ...makeToken('BLANK', '_:b0'), payload: { blankNodeId: 'http://example.org/.well-known/b0' } };
		expect(getIriFromToken(prefixes, token)).toBe('http://example.org/.well-known/b0');
	});

	it('returns undefined for an unrecognised token type', () => {
		const token = makeToken('STRING_LITERAL', '"hello"');
		expect(getIriFromToken(prefixes, token)).toBeUndefined();
	});
});

describe('getIriFromPrefixedName', () => {
	const prefixes = { ex: 'http://example.org/' };

	it('expands a prefixed name to a full IRI', () => {
		expect(getIriFromPrefixedName(prefixes, 'ex:Thing')).toBe('http://example.org/Thing');
	});

	it('returns undefined for an unknown prefix', () => {
		expect(getIriFromPrefixedName(prefixes, 'owl:Class')).toBeUndefined();
	});

	it('expands a prefix with an empty local name', () => {
		const pfx = { ex: 'http://example.org/' };
		expect(getIriFromPrefixedName(pfx, 'ex:')).toBe('http://example.org/');
	});

	it('returns undefined for a string without a colon', () => {
		expect(getIriFromPrefixedName(prefixes, 'noColon')).toBeUndefined();
	});
});

describe('getNamespaceIriFromPrefixedName', () => {
	const prefixes = { ex: 'http://example.org/', '': 'http://default.org/' };

	it('returns the namespace IRI for a known prefix', () => {
		expect(getNamespaceIriFromPrefixedName(prefixes, 'ex:Thing')).toBe('http://example.org/');
	});

	it('returns the namespace IRI for the empty prefix', () => {
		expect(getNamespaceIriFromPrefixedName(prefixes, ':local')).toBe('http://default.org/');
	});

	it('returns undefined for an unknown prefix', () => {
		expect(getNamespaceIriFromPrefixedName(prefixes, 'owl:Class')).toBeUndefined();
	});
});

describe('getNamespaceDefinition', () => {
	it('returns undefined when token is not a PREFIX or TTL_PREFIX token', () => {
		const tokens = [makeToken('IRIREF', '<http://example.org/>')];
		expect(getNamespaceDefinition(tokens, tokens[0])).toBeUndefined();
	});

	it('returns undefined when the PREFIX token is too close to the end of the array', () => {
		const t = makeToken('PREFIX', 'PREFIX');
		expect(getNamespaceDefinition([t], t)).toBeUndefined();
	});

	it('returns a namespace definition for a SPARQL PREFIX declaration', () => {
		const prefix = makeToken('PREFIX', 'PREFIX');
		const ns     = makeToken('PNAME_NS', 'ex:');
		const iri    = makeToken('IRIREF', '<http://example.org/>');
		const tokens = [prefix, ns, iri];

		const result = getNamespaceDefinition(tokens, prefix);
		expect(result).toEqual({ prefix: 'ex', uri: 'http://example.org/' });
	});

	it('returns a namespace definition for a Turtle @prefix declaration', () => {
		const prefix = makeToken('TTL_PREFIX', '@prefix');
		const ns     = makeToken('PNAME_NS', 'owl:');
		const iri    = makeToken('IRIREF', '<http://www.w3.org/2002/07/owl#>');
		const tokens = [prefix, ns, iri];

		const result = getNamespaceDefinition(tokens, prefix);
		expect(result).toEqual({ prefix: 'owl', uri: 'http://www.w3.org/2002/07/owl#' });
	});

	it('returns an empty-string prefix for a default prefix declaration', () => {
		const prefix = makeToken('PREFIX', 'PREFIX');
		const ns     = makeToken('PNAME_NS', ':');
		const iri    = makeToken('IRIREF', '<http://default.org/>');
		const tokens = [prefix, ns, iri];

		const result = getNamespaceDefinition(tokens, prefix);
		expect(result).toEqual({ prefix: '', uri: 'http://default.org/' });
	});

	it('returns undefined when the token after PREFIX is not PNAME_NS', () => {
		const prefix = makeToken('PREFIX', 'PREFIX');
		const wrong  = makeToken('IRIREF', '<http://example.org/>');
		const iri    = makeToken('IRIREF', '<http://example.org/>');
		const tokens = [prefix, wrong, iri];

		expect(getNamespaceDefinition(tokens, prefix)).toBeUndefined();
	});

	it('returns undefined when the token after PNAME_NS is not IRIREF', () => {
		const prefix = makeToken('PREFIX', 'PREFIX');
		const ns     = makeToken('PNAME_NS', 'ex:');
		const wrong  = makeToken('PNAME_LN', 'ex:Thing');
		const tokens = [prefix, ns, wrong];

		expect(getNamespaceDefinition(tokens, prefix)).toBeUndefined();
	});
});

describe('getTripleComponentType', () => {
	it('returns "subject" when tokenIndex is 0', () => {
		expect(getTripleComponentType([], 0)).toBe('subject');
	});

	it('returns "subject" after a PERIOD token', () => {
		const tokens = [makeToken('PERIOD', '.'), makeToken('IRIREF', '<http://example.org/Thing>')];
		expect(getTripleComponentType(tokens, 1)).toBe('subject');
	});

	it('returns "predicate" after a SEMICOLON token', () => {
		const tokens = [makeToken('SEMICOLON', ';'), makeToken('IRIREF', '<http://example.org/prop>')];
		expect(getTripleComponentType(tokens, 1)).toBe('predicate');
	});

	it('returns "object" after an A token', () => {
		const tokens = [makeToken('A', 'a'), makeToken('IRIREF', '<http://example.org/Class>')];
		expect(getTripleComponentType(tokens, 1)).toBe('object');
	});

	it('returns "object" when preceded by IRIREF after SEMICOLON', () => {
		// tokens: SEMICOLON, IRIREF (predicate), IRIREF (cursor position)
		const tokens = [
			makeToken('SEMICOLON', ';'),
			makeToken('IRIREF', '<http://example.org/prop>'),
			makeToken('IRIREF', '<http://example.org/value>'),
		];
		expect(getTripleComponentType(tokens, 2)).toBe('object');
	});

	it('returns "object" when preceded by IRIREF after LBRACKET', () => {
		const tokens = [
			makeToken('LBRACKET', '['),
			makeToken('IRIREF', '<http://example.org/prop>'),
			makeToken('IRIREF', '<http://example.org/value>'),
		];
		expect(getTripleComponentType(tokens, 2)).toBe('object');
	});

	it('returns "predicate" when preceded by IRIREF after PERIOD', () => {
		const tokens = [
			makeToken('PERIOD', '.'),
			makeToken('IRIREF', '<http://example.org/subject>'),
			makeToken('IRIREF', '<http://example.org/predicate>'),
		];
		expect(getTripleComponentType(tokens, 2)).toBe('predicate');
	});

	it('returns undefined for unrecognised preceding token', () => {
		const tokens = [makeToken('STRING_LITERAL', '"hello"'), makeToken('IRIREF', '<http://example.org/>')];
		expect(getTripleComponentType(tokens, 1)).toBeUndefined();
	});
});
