import { describe, expect, it } from 'vitest';
import { getNewValueType, startsLiteral } from './new-value-type';

describe('getNewValueType', () => {
	it('follows a predicate that takes one type of values only', () => {
		expect(getNewValueType('a tree', 'resource')).toBe('resource');
		expect(getNewValueType('ex:Tree', 'literal')).toBe('literal');
	});

	it('makes a resource of an empty text or a name, and a literal of any other text, where the predicate takes either', () => {
		expect(getNewValueType('', 'any')).toBe('resource');
		expect(getNewValueType('ex:Tree', 'any')).toBe('resource');
		expect(getNewValueType('<http://example.org/x>', 'any')).toBe('resource');
		expect(getNewValueType('Tree', 'any')).toBe('literal');
	});

	it('follows the type chosen for the text', () => {
		expect(getNewValueType('Tree', 'any', 'resource')).toBe('resource');
	});
});

describe('startsLiteral', () => {
	it('starts a literal from the first character where the predicate takes literals only', () => {
		expect(startsLiteral('T', 'literal')).toBe(true);
		expect(startsLiteral('', 'literal')).toBe(false);
	});

	it('never starts a literal where the predicate takes resources only', () => {
		expect(startsLiteral('a tree', 'resource')).toBe(false);
	});

	it('starts a literal once the text can no longer become a name, where the predicate takes either', () => {
		expect(startsLiteral('Tree', 'any')).toBe(false);
		expect(startsLiteral('ex:Tr', 'any')).toBe(false);
		expect(startsLiteral('Tree ', 'any')).toBe(true);
		expect(startsLiteral('4', 'any')).toBe(true);
		expect(startsLiteral(' ', 'any')).toBe(false);
	});

	it('keeps text a resource was chosen for in the input', () => {
		expect(startsLiteral('Tree oak', 'any', 'resource')).toBe(false);
	});
});
