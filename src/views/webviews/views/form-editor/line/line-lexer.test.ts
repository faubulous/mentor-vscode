import { describe, expect, it } from 'vitest';
import { LineLexer } from './line-lexer';

const lexer = new LineLexer();

describe('LineLexer.tokenize', () => {
	it('covers the text with tokens that carry their offsets', () => {
		const tokens = lexer.tokenize('rdfs:label "Tree"@en');

		expect(tokens.map(token => [token.kind, token.text, token.start])).toEqual([
			['name', 'rdfs:label', 0],
			['whitespace', ' ', 10],
			['literal', '"Tree"@en', 11]
		]);
		expect(tokens.map(token => token.text).join('')).toBe('rdfs:label "Tree"@en');
	});

	it('reads a literal with its language tag', () => {
		expect(lexer.tokenize('"Tree"@en')[0]).toMatchObject({ kind: 'literal', value: 'Tree', language: 'en', closed: true, quoteStart: 0, quoteEnd: 5, suffix: '@en' });
	});

	it('attaches a language tag written before the quote', () => {
		expect(lexer.tokenize('rdfs:label @en "x"')[2]).toMatchObject({ kind: 'literal', text: '@en "x"', start: 11, value: 'x', language: 'en', languageFirst: true, gap: ' ', quoteStart: 15, quoteEnd: 17 });
	});

	it('reads an unclosed literal to the end of the line', () => {
		expect(lexer.tokenize('rdfs:label "abc')[2]).toMatchObject({ kind: 'literal', text: '"abc', value: 'abc', closed: false, quoteEnd: -1 });
	});

	it('reads a datatype written as a prefixed name or an IRI', () => {
		expect(lexer.tokenize('"1"^^xsd:int')[0]).toMatchObject({ kind: 'literal', datatype: 'xsd:int', suffix: '^^xsd:int', text: '"1"^^xsd:int' });
		expect(lexer.tokenize('"1"^^<http://x/y> z')[0]).toMatchObject({ kind: 'literal', datatype: '<http://x/y>', text: '"1"^^<http://x/y>' });
	});

	it('keeps escaped quotes inside a literal', () => {
		expect(lexer.tokenize('"a\\"b" c')[0]).toMatchObject({ kind: 'literal', value: 'a\\"b', closed: true, text: '"a\\"b"' });
	});

	it('reads the markers typed for new nested nodes, closed or not', () => {
		expect(lexer.items(lexer.tokenize('ex:p [] [ ] [')).slice(1).map(token => [token.kind, token.text])).toEqual([['nestedNode', '[]'], ['nestedNode', '[ ]'], ['nestedNode', '[']]);
	});

	it('reads list brackets and separators as punctuation', () => {
		const tokens = lexer.tokenize('ex:p ( ex:a "b" ), ex:c;');

		expect(tokens.filter(token => token.kind === 'punctuation').map(token => [token.text, token.start])).toEqual([['(', 5], [')', 16], [',', 17], [';', 23]]);
		expect(tokens.find(token => token.start === 7)).toMatchObject({ kind: 'name', text: 'ex:a' });
	});

	it('reads a dangling language tag and an IRI reference', () => {
		expect(lexer.tokenize('ex:p @en <http://x/y>').filter(token => token.kind !== 'whitespace')).toMatchObject([
			{ kind: 'name' },
			{ kind: 'languageTag', text: '@en', start: 5 },
			{ kind: 'iri', text: '<http://x/y>', start: 9 }
		]);
	});

	it('reads an unclosed IRI to the end of the line', () => {
		expect(lexer.tokenize('a <http://x')[2]).toMatchObject({ kind: 'iri', text: '<http://x' });
	});
});

describe('LineLexer.items', () => {
	it('drops whitespace and punctuation', () => {
		expect(lexer.items(lexer.tokenize('a owl:Class, owl:Thing')).map(token => token.text)).toEqual(['a', 'owl:Class', 'owl:Thing']);
	});
});

describe('LineLexer.tokenAt', () => {
	it('finds the item the caret is in or touches', () => {
		expect(lexer.tokenAt('a owl:Class', 0)?.text).toBe('a');
		expect(lexer.tokenAt('a owl:Class', 1)?.text).toBe('a');
		expect(lexer.tokenAt('a owl:Class', 2)?.text).toBe('owl:Class');
		expect(lexer.tokenAt('a owl:Class', 11)?.text).toBe('owl:Class');
	});

	it('finds nothing in whitespace', () => {
		expect(lexer.tokenAt('a  owl:Class', 2)).toBeUndefined();
	});
});

describe('LineLexer.valueGroups', () => {
	it('keeps the items of a list together', () => {
		const groups = lexer.valueGroups(lexer.tokenize('ex:p ex:a ( ex:b "c" ) ex:d'));

		expect(groups.map(group => [group.list, group.items.map(item => item.text), group.start, group.end])).toEqual([
			[false, ['ex:a'], 5, 9],
			[true, ['ex:b', '"c"'], 10, 22],
			[false, ['ex:d'], 23, 27]
		]);
	});

	it('runs an unclosed list to the end of the line', () => {
		expect(lexer.valueGroups(lexer.tokenize('ex:p ( ex:a'))).toMatchObject([{ list: true, items: [{ text: 'ex:a' }] }]);
	});
});

describe('LineLexer.bareDatatypeOf', () => {
	it('recognises the Turtle shorthand literals', () => {
		expect(LineLexer.bareDatatypeOf('true')).toBe('xsd:boolean');
		expect(LineLexer.bareDatatypeOf('false')).toBe('xsd:boolean');
		expect(LineLexer.bareDatatypeOf('42')).toBe('xsd:integer');
		expect(LineLexer.bareDatatypeOf('-7')).toBe('xsd:integer');
		expect(LineLexer.bareDatatypeOf('1.5')).toBe('xsd:decimal');
		expect(LineLexer.bareDatatypeOf('.5')).toBe('xsd:decimal');
		expect(LineLexer.bareDatatypeOf('1e10')).toBe('xsd:double');
		expect(LineLexer.bareDatatypeOf('1.5E-3')).toBe('xsd:double');
	});

	it('leaves words alone', () => {
		expect(LineLexer.bareDatatypeOf('abc')).toBeUndefined();
		expect(LineLexer.bareDatatypeOf('ex:Tree')).toBeUndefined();
		expect(LineLexer.bareDatatypeOf('')).toBeUndefined();
	});
});

describe('comments and separators', () => {
	it('recognises and strips comment lines', () => {
		expect(LineLexer.isComment('# hello')).toBe(true);
		expect(LineLexer.isComment('  # x')).toBe(true);
		expect(LineLexer.isComment('a owl:Class')).toBe(false);
		expect(LineLexer.stripComment('# hello')).toBe('hello');
		expect(LineLexer.stripComment('#hello')).toBe('hello');
		expect(LineLexer.stripComment('  # x ')).toBe('x');
	});

	it('treats whitespace, commas, semicolons and brackets as separators', () => {
		expect([' ', '\t', ',', ';', '(', ')'].every(LineLexer.isSeparator)).toBe(true);
		expect(LineLexer.isSeparator('a')).toBe(false);
		expect(LineLexer.isSeparator(undefined)).toBe(false);
	});
});
