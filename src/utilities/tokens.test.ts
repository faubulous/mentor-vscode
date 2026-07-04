import { describe, it, expect, vi } from 'vitest';

vi.mock('@faubulous/mentor-rdf-parsers', () => ({
	RdfToken: {
		IRIREF:                        { name: 'IRIREF' },
		PNAME_LN:                      { name: 'PNAME_LN' },
		PNAME_NS:                      { name: 'PNAME_NS' },
		PREFIX:                        { name: 'PREFIX' },
		TTL_PREFIX:                    { name: 'TTL_PREFIX' },
		PERIOD:                        { name: 'PERIOD' },
		SEMICOLON:                     { name: 'SEMICOLON' },
		A:                             { name: 'A' },
		LBRACKET:                      { name: 'LBRACKET' },
		LCURLY:                        { name: 'LCURLY' },
		VAR1:                          { name: 'VAR1' },
		VAR2:                          { name: 'VAR2' },
		STRING_LITERAL_QUOTE:          { name: 'STRING_LITERAL_QUOTE' },
		STRING_LITERAL_SINGLE_QUOTE:   { name: 'STRING_LITERAL_SINGLE_QUOTE' },
		STRING_LITERAL_LONG_QUOTE:     { name: 'STRING_LITERAL_LONG_QUOTE' },
		STRING_LITERAL_LONG_SINGLE_QUOTE: { name: 'STRING_LITERAL_LONG_SINGLE_QUOTE' },
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
	getUnquotedLiteralValue,
	isTypeAssertionObject,
	getTokenIndexAtPosition,
	getTokenAtPosition,
	getTokenBeforePosition,
	isPrefixTokenAtPosition,
	getTokenRange,
} from '@src/utilities/tokens';

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

	it('returns "subject" after an LCURLY token (SPARQL group graph pattern)', () => {
		// WHERE { nexus:
		const tokens = [makeToken('LCURLY', '{'), makeToken('PNAME_NS', 'nexus:')];
		expect(getTripleComponentType(tokens, 1)).toBe('subject');
	});

	it('returns "predicate" after a variable that opens a group graph pattern', () => {
		// { ?s nexus:
		const tokens = [
			makeToken('LCURLY', '{'),
			makeToken('VAR1', '?s'),
			makeToken('PNAME_NS', 'nexus:'),
		];
		expect(getTripleComponentType(tokens, 2)).toBe('predicate');
	});

	it('returns "predicate" after a variable that follows a PERIOD', () => {
		// ?a ?b ?c . ?s nexus:
		const tokens = [
			makeToken('PERIOD', '.'),
			makeToken('VAR1', '?s'),
			makeToken('PNAME_NS', 'nexus:'),
		];
		expect(getTripleComponentType(tokens, 2)).toBe('predicate');
	});

	it('returns "predicate" after a variable at the start of the token stream', () => {
		// ?s nexus:
		const tokens = [
			makeToken('VAR1', '?s'),
			makeToken('PNAME_NS', 'nexus:'),
		];
		expect(getTripleComponentType(tokens, 1)).toBe('predicate');
	});

	it('returns "object" after a variable that follows another variable', () => {
		// ?s ?p nexus:
		const tokens = [
			makeToken('VAR1', '?s'),
			makeToken('VAR2', '$p'),
			makeToken('PNAME_NS', 'nexus:'),
		];
		expect(getTripleComponentType(tokens, 2)).toBe('object');
	});

	it('returns "object" after a variable that follows a SEMICOLON', () => {
		// ; ?p nexus:
		const tokens = [
			makeToken('SEMICOLON', ';'),
			makeToken('VAR1', '?p'),
			makeToken('PNAME_NS', 'nexus:'),
		];
		expect(getTripleComponentType(tokens, 2)).toBe('object');
	});

	it('returns "object" after a prefixed name predicate that follows a variable subject', () => {
		// ?s nexus:p nexus:
		const tokens = [
			makeToken('VAR1', '?s'),
			makeToken('PNAME_LN', 'nexus:p'),
			makeToken('PNAME_NS', 'nexus:'),
		];
		expect(getTripleComponentType(tokens, 2)).toBe('object');
	});
});

describe('isTypeAssertionObject', () => {
	const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';

	it('returns true when the preceding predicate is the "a" keyword', () => {
		const tokens = [makeToken('A', 'a'), makeToken('PNAME_NS', 'nexus:')];
		expect(isTypeAssertionObject(tokens, 1, {})).toBe(true);
	});

	it('returns true when the preceding predicate is a prefixed name resolving to rdf:type', () => {
		const tokens = [makeToken('PNAME_LN', 'rdf:type'), makeToken('PNAME_NS', 'nexus:')];
		const prefixes = { rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#' };
		expect(isTypeAssertionObject(tokens, 1, prefixes)).toBe(true);
	});

	it('returns true when the preceding predicate is an IRI reference equal to rdf:type', () => {
		const tokens = [makeToken('IRIREF', `<${RDF_TYPE}>`), makeToken('PNAME_NS', 'nexus:')];
		expect(isTypeAssertionObject(tokens, 1, {})).toBe(true);
	});

	it('returns false when the prefixed name resolves to a different IRI', () => {
		const tokens = [makeToken('PNAME_LN', 'rdf:value'), makeToken('PNAME_NS', 'nexus:')];
		const prefixes = { rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#' };
		expect(isTypeAssertionObject(tokens, 1, prefixes)).toBe(false);
	});

	it('returns false when the prefix of the predicate is not defined', () => {
		const tokens = [makeToken('PNAME_LN', 'rdf:type'), makeToken('PNAME_NS', 'nexus:')];
		expect(isTypeAssertionObject(tokens, 1, {})).toBe(false);
	});

	it('returns false for a non-type predicate', () => {
		const tokens = [makeToken('PNAME_LN', 'nexus:hasPart'), makeToken('PNAME_NS', 'nexus:')];
		expect(isTypeAssertionObject(tokens, 1, { nexus: 'http://example.org/nexus#' })).toBe(false);
	});

	it('returns false when there is no preceding token', () => {
		const tokens = [makeToken('PNAME_NS', 'nexus:')];
		expect(isTypeAssertionObject(tokens, 0, {})).toBe(false);
	});
});

describe('getUnquotedLiteralValue', () => {
	it('strips double quotes from STRING_LITERAL_QUOTE', () => {
		expect(getUnquotedLiteralValue(makeToken('STRING_LITERAL_QUOTE', '"world"'))).toBe('world');
	});

	it('strips single quotes from STRING_LITERAL_SINGLE_QUOTE', () => {
		expect(getUnquotedLiteralValue(makeToken('STRING_LITERAL_SINGLE_QUOTE', "'hello'"))).toBe('hello');
	});

	it('strips triple double quotes from STRING_LITERAL_LONG_QUOTE', () => {
		expect(getUnquotedLiteralValue(makeToken('STRING_LITERAL_LONG_QUOTE', '"""multi"""'))).toBe('multi');
	});

	it('strips triple single quotes from STRING_LITERAL_LONG_SINGLE_QUOTE', () => {
		expect(getUnquotedLiteralValue(makeToken('STRING_LITERAL_LONG_SINGLE_QUOTE', "'''multi'''"))).toBe('multi');
	});

	it('returns raw image for non-literal tokens', () => {
		expect(getUnquotedLiteralValue(makeToken('INTEGER', '42'))).toBe('42');
	});
});

describe('getTokenIndexAtPosition', () => {
	// Tokens are 1-based (chevrotain); positions are 0-based (editor).
	function tok(name: string, image: string, startLine: number, startColumn: number) {
		return { tokenType: { name }, image, startLine, endLine: startLine, startColumn, endColumn: startColumn + image.length - 1 };
	}

	it('returns the index of a single-line token containing the position', () => {
		const tokens = [tok('PERIOD', '.', 1, 1), tok('PNAME_NS', 'ex:', 1, 3)];

		// The colon of `ex:` is at 1-based column 5 → 0-based character 4.
		expect(getTokenIndexAtPosition(tokens, { line: 0, character: 4 })).toBe(1);
	});

	it('returns -1 when there are no tokens', () => {
		expect(getTokenIndexAtPosition([], { line: 0, character: 0 })).toBe(-1);
	});

	it('returns -1 when the position is past the last token', () => {
		const tokens = [tok('PNAME_NS', 'ex:', 1, 1)];

		expect(getTokenIndexAtPosition(tokens, { line: 5, character: 0 })).toBe(-1);
	});

	it('matches a token on a later line', () => {
		const tokens = [tok('PERIOD', '.', 1, 1), tok('PNAME_NS', 'foo:', 2, 1)];

		// `foo:` is on line index 1; the colon is at 0-based character 3.
		expect(getTokenIndexAtPosition(tokens, { line: 1, character: 3 })).toBe(1);
	});

	it('skips tokens with missing positions', () => {
		const tokens = [
			{ tokenType: { name: 'X' }, image: 'x' },
			tok('PNAME_NS', 'ex:', 1, 1),
		];

		expect(getTokenIndexAtPosition(tokens as any, { line: 0, character: 2 })).toBe(1);
	});
});

describe('getTokenAtPosition', () => {
	it('returns undefined when no token covers the position', () => {
		const tokens = [makeToken('PNAME_LN', 'ex:A', 1, 1, 1, 4)];

		expect(getTokenAtPosition(tokens, { line: 9, character: 0 })).toBeUndefined();
	});

	it('returns the correct token at a given position', () => {
		const tokens = [
			makeToken('PNAME_LN', 'ex:A', 1, 1, 1, 4),
			makeToken('PERIOD', '.', 1, 6, 1, 6),
		];

		expect(getTokenAtPosition(tokens, { line: 0, character: 2 })?.image).toBe('ex:A');
	});
});

describe('getTokenBeforePosition', () => {
	it('returns the previous token when a token is found at the position (index > 0)', () => {
		const tokens = [
			makeToken('TTL_PREFIX', '@prefix', 1, 1, 1, 7),
			makeToken('PNAME_NS', 'ex:', 1, 9, 1, 11),
		];

		expect(getTokenBeforePosition(tokens, { line: 0, character: 9 })?.image).toBe('@prefix');
	});

	it('returns undefined when the position is at the first token (index === 0)', () => {
		const tokens = [makeToken('TTL_PREFIX', '@prefix', 1, 1, 1, 7)];

		expect(getTokenBeforePosition(tokens, { line: 0, character: 3 })).toBeUndefined();
	});

	it('returns the last token before the position when none is at it (backward scan, later line)', () => {
		const tokens = [makeToken('PNAME_LN', 'ex:A', 1, 1, 1, 4)];

		expect(getTokenBeforePosition(tokens, { line: 1, character: 0 })?.image).toBe('ex:A');
	});

	it('returns the last token before the position on the same line (endColumn <= character)', () => {
		const tokens = [makeToken('PNAME_LN', 'ex:A', 1, 1, 1, 4)];

		expect(getTokenBeforePosition(tokens, { line: 0, character: 6 })?.image).toBe('ex:A');
	});

	it('returns undefined when no token precedes the position in the backward scan', () => {
		const tokens = [makeToken('PNAME_LN', 'ex:A', 3, 1, 3, 4)];

		expect(getTokenBeforePosition(tokens, { line: 0, character: 0 })).toBeUndefined();
	});
});

describe('isPrefixTokenAtPosition', () => {
	it('returns true when the cursor is on the prefix part of a prefixed name', () => {
		const token = makeToken('PNAME_LN', 'ex:Thing', 1, 1, 1, 8);

		expect(isPrefixTokenAtPosition(token, { line: 0, character: 1 })).toBe(true);
	});

	it('returns false when the cursor is on the local-name part', () => {
		const token = makeToken('PNAME_LN', 'ex:Thing', 1, 1, 1, 8);

		expect(isPrefixTokenAtPosition(token, { line: 0, character: 5 })).toBe(false);
	});

	it('returns false for a non-prefixed token type', () => {
		const token = makeToken('IRIREF', '<http://example.org/>', 1, 1, 1, 21);

		expect(isPrefixTokenAtPosition(token, { line: 0, character: 5 })).toBe(false);
	});
});

describe('getTokenRange', () => {
	it('converts 1-based token positions to a 0-based range', () => {
		const token = makeToken('PNAME_LN', 'ex:A', 2, 5, 2, 8);
		const range = getTokenRange(token);

		expect(range.start.line).toBe(1);
		expect(range.start.character).toBe(4);
	});

	it('applies +1 to the end character', () => {
		const token = makeToken('PERIOD', '.', 1, 10, 1, 10);
		const range = getTokenRange(token);

		// endColumn 10 → 9 (0-based), then +1 = 10.
		expect(range.end.character).toBe(10);
	});

	it('trims leading and trailing whitespace from the token image', () => {
		// A token image with surrounding whitespace (millan quirk).
		const token = makeToken('PNAME_LN', '  ex:A ', 1, 1, 1, 7);
		const range = getTokenRange(token);

		// startCharacter 0 + 2 leading spaces = 2.
		expect(range.start.character).toBe(2);
		// endCharacter 6 - 1 trailing space + 1 = 6.
		expect(range.end.character).toBe(6);
	});
});
