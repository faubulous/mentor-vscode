import { describe, it, expect } from 'vitest';
import { countLeadingWhitespace, countTrailingWhitespace, findPosition } from './string';

describe('countLeadingWhitespace', () => {
	it('returns 0 for a string with no leading whitespace', () => {
		expect(countLeadingWhitespace('hello')).toBe(0);
	});

	it('counts spaces at the start', () => {
		expect(countLeadingWhitespace('   hello')).toBe(3);
	});

	it('counts tabs at the start', () => {
		expect(countLeadingWhitespace('\t\thello')).toBe(2);
	});

	it('returns the full length for an all-whitespace string', () => {
		expect(countLeadingWhitespace('   ')).toBe(3);
	});

	it('returns 0 for an empty string', () => {
		expect(countLeadingWhitespace('')).toBe(0);
	});
});

describe('countTrailingWhitespace', () => {
	it('returns 0 for a string with no trailing whitespace', () => {
		expect(countTrailingWhitespace('hello')).toBe(0);
	});

	it('counts spaces at the end', () => {
		expect(countTrailingWhitespace('hello   ')).toBe(3);
	});

	it('counts tabs at the end', () => {
		expect(countTrailingWhitespace('hello\t\t')).toBe(2);
	});

	it('returns the full length for an all-whitespace string', () => {
		expect(countTrailingWhitespace('   ')).toBe(3);
	});

	it('returns 0 for an empty string', () => {
		expect(countTrailingWhitespace('')).toBe(0);
	});
});

describe('findPosition', () => {
	it('returns the position of text on the first line', () => {
		const pos = findPosition('PREFIX ex: <http://example.org/>', 'ex:');
		expect(pos).toEqual({ line: 0, character: 7 });
	});

	it('returns the correct line when the text is on a later line', () => {
		const str = 'line one\nline two\nline three';
		const pos = findPosition(str, 'line three');
		expect(pos).toEqual({ line: 2, character: 0 });
	});

	it('returns the correct character offset within a line', () => {
		const str = 'abc def\nghi jkl';
		const pos = findPosition(str, 'jkl');
		expect(pos).toEqual({ line: 1, character: 4 });
	});

	it('returns undefined when the text is not found', () => {
		expect(findPosition('hello world', 'xyz')).toBeUndefined();
	});

	it('returns position {line:0, character:0} for text at the very start', () => {
		const pos = findPosition('PREFIX', 'PREFIX');
		expect(pos).toEqual({ line: 0, character: 0 });
	});
});
