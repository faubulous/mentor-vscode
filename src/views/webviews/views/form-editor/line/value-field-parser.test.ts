import { describe, expect, it } from 'vitest';
import { ValueFieldParser } from './value-field-parser';

const parser = new ValueFieldParser();

describe('ValueFieldParser.parse', () => {
	it('reads quoted literals, new nested nodes, numbers and lists', () => {
		expect(parser.parse('"Tree"@en', 'any')).toEqual({ kind: 'literal', value: 'Tree', suffix: '@en' });
		expect(parser.parse('[', 'any')).toEqual({ kind: 'nestedNode' });
		expect(parser.parse('[]', 'resource')).toEqual({ kind: 'nestedNode' });
		expect(parser.parse('12', 'any')).toEqual({ kind: 'shorthandLiteral', text: '12' });
		expect(parser.parse('( ex:a )', 'any')).toEqual({ kind: 'source', text: '( ex:a )' });
	});

	it('reads a name as a resource unless the predicate takes text', () => {
		expect(parser.parse('ex:Tree', 'any')).toEqual({ kind: 'resource', text: 'ex:Tree' });
		expect(parser.parse('ex:Tree', 'literal')).toEqual({ kind: 'literal', value: 'ex:Tree', suffix: '' });
		expect(parser.parse('12', 'literal')).toEqual({ kind: 'literal', value: '12', suffix: '' });
	});

	it('reads plain text as a literal and nothing from blanks', () => {
		expect(parser.parse('a tree', 'any')).toEqual({ kind: 'literal', value: 'a tree', suffix: '' });
		expect(parser.parse('   ', 'any')).toBeUndefined();
	});

	it('keeps two values typed into one field as source', () => {
		expect(parser.parse('"a" "b"', 'any')).toEqual({ kind: 'source', text: '"a" "b"' });
	});
});

describe('ValueFieldParser.listItemsOf', () => {
	it('splits a list into the fields of its items, keeping a list within it whole', () => {
		expect(parser.listItemsOf({ kind: 'source', text: '( ex:a "b"@en [] ( ex:c ) )' })).toEqual([
			{ kind: 'resource', text: 'ex:a' },
			{ kind: 'literal', value: 'b', suffix: '@en' },
			{ kind: 'nestedNode' },
			{ kind: 'source', text: '( ex:c )' }
		]);
		expect(parser.listItemsOf({ kind: 'source', text: '( )' })).toEqual([]);
	});

	it('leaves values that are not lists alone', () => {
		expect(parser.listItemsOf({ kind: 'resource', text: 'ex:a' })).toBeUndefined();
		expect(parser.listItemsOf({ kind: 'source', text: 'ex:a ex:b' })).toBeUndefined();
	});
});

describe('ValueFieldParser.countNestedNodeMarkers', () => {
	it('counts the markers a value holds, within lists too', () => {
		expect(parser.countNestedNodeMarkers({ kind: 'nestedNode' })).toBe(1);
		expect(parser.countNestedNodeMarkers({ kind: 'source', text: '( ex:a [] ( [] ) )' })).toBe(2);
		expect(parser.countNestedNodeMarkers({ kind: 'resource', text: 'ex:a' })).toBe(0);
	});
});

describe('ValueFieldParser.expectsResource', () => {
	it('expects resources for resource ranges, names and empty text, never for text ranges', () => {
		expect(parser.expectsResource('resource', 'foo bar')).toBe(true);
		expect(parser.expectsResource('any', '')).toBe(true);
		expect(parser.expectsResource('any', 'ex:T')).toBe(true);
		expect(parser.expectsResource('any', '42')).toBe(false);
		expect(parser.expectsResource('literal', 'ex:T')).toBe(false);
	});
});

describe('ValueFieldParser.isName', () => {
	it('recognises prefixed names and IRI references, even unclosed', () => {
		expect(ValueFieldParser.isName('ex:Tree')).toBe(true);
		expect(ValueFieldParser.isName('<http://x')).toBe(true);
		expect(ValueFieldParser.isName('a tree')).toBe(false);
		expect(ValueFieldParser.isName('ex:a b')).toBe(false);
	});
});
