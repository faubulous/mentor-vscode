import { describe, expect, it } from 'vitest';
import { OWL, RDF, XSD, _XSD } from '@faubulous/mentor-rdf';
import { EXAMPLE_NAMESPACE, LINE_TEST_NAMESPACES } from '@src/utilities/mocks/line-fixtures';
import { TermView } from '../form-editor-model';
import { LineParser } from './line-parser';
import { LineSerializer } from './line-serializer';
import { ParsedLine, isLineProblem } from './parsed-line';

const parser = new LineParser(LINE_TEST_NAMESPACES);
const serializer = new LineSerializer(LINE_TEST_NAMESPACES);

/**
 * Parse a line that must be a statement.
 */
function statement(text: string): ParsedLine {
	const result = parser.parse(text);

	if (isLineProblem(result)) {
		throw new Error(result.message);
	}

	return result;
}

/**
 * Parse a line that must be a problem and return its message and span.
 */
function problem(text: string): [string, number, number] {
	const result = parser.parse(text);

	if (!isLineProblem(result)) {
		throw new Error('expected a problem');
	}

	return [result.message, result.start, result.end];
}

/**
 * Make a term view.
 */
function view(term: TermView['term'], prefixedName?: string): TermView {
	return { term, editable: true, prefixedName };
}

describe('LineParser.parse', () => {
	it('reads a as rdf:type and prefixed names as IRIs', () => {
		expect(statement('a owl:Class')).toEqual({ predicate: RDF.type, values: [{ kind: 'term', term: { kind: 'iri', iri: OWL.Class } }] });
	});

	it('reads literals with language, datatype and shorthand forms', () => {
		expect(statement('rdfs:label "x"@en').values).toEqual([{ kind: 'term', term: { kind: 'literal', value: 'x', language: 'en' } }]);
		expect(statement('ex:p "1"^^xsd:int').values).toEqual([{ kind: 'term', term: { kind: 'literal', value: '1', datatype: XSD.int } }]);
		expect(statement('ex:p "1"^^<http://x/t>').values).toEqual([{ kind: 'term', term: { kind: 'literal', value: '1', datatype: 'http://x/t' } }]);
		expect(statement('ex:p 42 true 1.5 1e3').values.map(value => value.kind === 'term' && value.term.kind === 'literal' ? value.term.datatype : undefined)).toEqual([XSD.integer, XSD.boolean, XSD.decimal, XSD.double]);
		expect(statement('ex:p "x"').values).toEqual([{ kind: 'term', term: { kind: 'literal', value: 'x' } }]);
	});

	it('reads IRI references', () => {
		expect(statement('<http://x/p> <http://x/y>')).toEqual({ predicate: 'http://x/p', values: [{ kind: 'term', term: { kind: 'iri', iri: 'http://x/y' } }] });
	});

	it('reads lists and numbers the placeholders', () => {
		expect(statement('rdfs:range ( ex:a "b" ) ex:c').values).toEqual([
			{ kind: 'list', items: [{ kind: 'term', term: { kind: 'iri', iri: `${EXAMPLE_NAMESPACE}a` } }, { kind: 'term', term: { kind: 'literal', value: 'b' } }] },
			{ kind: 'term', term: { kind: 'iri', iri: `${EXAMPLE_NAMESPACE}c` } }
		]);
		expect(statement('ex:p […] ex:a [] ( [ ] )').values).toEqual([
			{ kind: 'placeholder', index: 0 },
			{ kind: 'term', term: { kind: 'iri', iri: `${EXAMPLE_NAMESPACE}a` } },
			{ kind: 'placeholder', index: 1 },
			{ kind: 'list', items: [{ kind: 'placeholder', index: 2 }] }
		]);
	});

	it('unescapes literals', () => {
		expect(statement('ex:p "a\\"b\\\\c\\n\\u00e9"').values).toEqual([{ kind: 'term', term: { kind: 'literal', value: 'a"b\\c\né' } }]);
	});

	it('ignores commas and semicolons', () => {
		expect(statement('a owl:Class, owl:Thing;').values).toHaveLength(2);
	});

	it('reports what stops a line from being a statement', () => {
		expect(problem('')).toEqual(['A line starts with its predicate', 0, 0]);
		expect(problem('"x"')[0]).toBe('A line starts with its predicate');
		expect(problem('foo:x "a"')).toEqual(['Unknown prefix "foo:"', 0, 5]);
		expect(problem('label "a"')).toEqual(['"label" is not a predicate', 0, 5]);
		expect(problem('ex:p "abc')).toEqual(['Unclosed quote', 5, 9]);
		expect(problem('ex:p @en')).toEqual(['A language tag needs a literal before it', 5, 8]);
		expect(problem('ex:p ( ex:a')).toEqual(['Unmatched "("', 5, 6]);
		expect(problem('ex:p )')).toEqual(['Unmatched ")"', 5, 6]);
		expect(problem('ex:p foo:x')).toEqual(['Unknown prefix "foo:"', 5, 10]);
		expect(problem('ex:p word')).toEqual(['"word" is not a known term', 5, 9]);
		expect(problem('ex:p "1"^^foo:int')).toEqual(['"foo:int" is not a datatype', 5, 17]);
		expect(problem('ex:p <http://x')).toEqual(['Unclosed IRI', 5, 14]);
	});
});

describe('round trips', () => {
	it('serialize then parse returns the terms', () => {
		const values: TermView[] = [
			view({ kind: 'iri', iri: `${EXAMPLE_NAMESPACE}Tree` }, 'ex:Tree'),
			view({ kind: 'literal', value: 'x "y"', language: 'en' }),
			view({ kind: 'literal', value: '1', datatype: XSD.int }),
			view({ kind: 'literal', value: '42', datatype: XSD.integer }),
			view({ kind: 'literal', value: 'true', datatype: XSD.boolean }),
			view({ kind: 'literal', value: '1.5', datatype: XSD.decimal }),
			view({ kind: 'iri', iri: 'http://x/y' }),
			view({ kind: 'literal', value: 'line\nbreak' })
		];
		const model = serializer.serializeProperty({ predicate: view({ kind: 'iri', iri: `${EXAMPLE_NAMESPACE}p` }, 'ex:p'), values });

		expect(statement(model.text)).toEqual({ predicate: `${EXAMPLE_NAMESPACE}p`, values: values.map(value => ({ kind: 'term', term: value.term })) });
	});

	it('serialize then parse keeps lists and placeholders', () => {
		const placeholder = view({ kind: 'bnode', id: 'b1' });
		const list: TermView = { ...view({ kind: 'bnode', id: 'b2' }), collection: { items: [view({ kind: 'iri', iri: `${EXAMPLE_NAMESPACE}a` }, 'ex:a'), view({ kind: 'literal', value: 'b' })] } };
		const model = serializer.serializeProperty({ predicate: view({ kind: 'iri', iri: RDF.type }, 'rdf:type'), values: [list, placeholder] });

		expect(model.text).toBe('a ( ex:a "b" ) […]');
		expect(statement(model.text)).toEqual({
			predicate: RDF.type,
			values: [
				{ kind: 'list', items: [{ kind: 'term', term: { kind: 'iri', iri: `${EXAMPLE_NAMESPACE}a` } }, { kind: 'term', term: { kind: 'literal', value: 'b' } }] },
				{ kind: 'placeholder', index: 0 }
			]
		});
		expect(model.placeholders).toEqual([placeholder]);
	});

	it('names the XML Schema datatypes as the parser does', () => {
		expect(statement('ex:p 1').values).toEqual([{ kind: 'term', term: { kind: 'literal', value: '1', datatype: `${_XSD}integer` } }]);
	});
});

describe('LineParser.unescapeLiteral', () => {
	it('reads the Turtle escapes', () => {
		expect(LineParser.unescapeLiteral('a\\"b\\\\c\\n\\t\\r')).toBe('a"b\\c\n\t\r');
		expect(LineParser.unescapeLiteral('\\u0041\\U00000042')).toBe('AB');
		expect(LineParser.unescapeLiteral('plain')).toBe('plain');
	});
});
