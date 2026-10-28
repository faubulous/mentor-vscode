import { describe, expect, it } from 'vitest';
import { OWL, RDF, RDFS, XSD } from '@faubulous/mentor-rdf';
import { EXAMPLE_NAMESPACE, LINE_TEST_NAMESPACES } from '@src/utilities/mocks/line-fixtures';
import { PropertyView, TermRef, TermView } from '../form-editor-model';
import { LineSerializer } from './line-serializer';

const serializer = new LineSerializer(LINE_TEST_NAMESPACES);

/**
 * Make a term view.
 */
function view(term: TermRef, extra: Partial<TermView> = {}): TermView {
	return { term, editable: true, ...extra };
}

/**
 * Make an IRI view with its prefixed name.
 */
function iri(iri: string, prefixedName?: string): TermView {
	return view({ kind: 'iri', iri }, { prefixedName });
}

/**
 * Make a literal view.
 */
function literal(value: string, extra: { language?: string; datatype?: string } = {}): TermView {
	return view({ kind: 'literal', value, ...extra });
}

/**
 * Make a property view.
 */
function property(predicate: TermView, values: TermView[]): PropertyView {
	return { predicate, values };
}

describe('LineSerializer.serializeProperty', () => {
	it('writes rdf:type as a and keeps the term views', () => {
		const type = iri(RDF.type, 'rdf:type');
		const owlClass = iri(OWL.Class, 'owl:Class');
		const model = serializer.serializeProperty(property(type, [owlClass]));

		expect(model.text).toBe('a owl:Class');
		expect(model.terms.a).toBe(type);
		expect(model.terms['owl:Class']).toBe(owlClass);
		expect(model.placeholders).toEqual([]);
	});

	it('writes literals with their language or datatype', () => {
		const label = iri(RDFS.label, 'rdfs:label');

		expect(serializer.serializeProperty(property(label, [literal('x', { language: 'en' })])).text).toBe('rdfs:label "x"@en');
		expect(serializer.serializeProperty(property(label, [literal('1', { datatype: XSD.int })])).text).toBe('rdfs:label "1"^^xsd:int');
		expect(serializer.serializeProperty(property(label, [literal('x', { datatype: XSD.string })])).text).toBe('rdfs:label "x"');
	});

	it('writes numbers and booleans bare when their lexical form allows it', () => {
		const p = iri(`${EXAMPLE_NAMESPACE}p`, 'ex:p');
		const values = [
			literal('42', { datatype: XSD.integer }),
			literal('true', { datatype: XSD.boolean }),
			literal('1.5', { datatype: XSD.decimal }),
			literal('1.5', { datatype: XSD.double }),
			literal('abc', { datatype: XSD.integer })
		];

		expect(serializer.serializeProperty(property(p, values)).text).toBe('ex:p 42 true 1.5 "1.5"^^xsd:double "abc"^^xsd:integer');
	});

	it('falls back to an IRI reference without a prefix', () => {
		expect(serializer.serializeProperty(property(iri('http://x/p'), [iri('http://x/y')])).text).toBe('<http://x/p> <http://x/y>');
		expect(serializer.serializeProperty(property(iri(`${EXAMPLE_NAMESPACE}p`), [iri(`${EXAMPLE_NAMESPACE}Tree`)])).text).toBe('ex:p ex:Tree');
	});

	it('writes lists in place', () => {
		const list = view({ kind: 'bnode', id: 'b1' }, { collection: { items: [iri(`${EXAMPLE_NAMESPACE}a`, 'ex:a'), literal('b')] } });
		const empty = view({ kind: 'bnode', id: 'b2' }, { collection: { items: [] } });

		expect(serializer.serializeProperty(property(iri(`${EXAMPLE_NAMESPACE}p`, 'ex:p'), [list, empty])).text).toBe('ex:p ( ex:a "b" ) ( )');
	});

	it('writes blank nodes as placeholders and collects them in order', () => {
		const first = view({ kind: 'bnode', id: 'b1' });
		const second = view({ kind: 'bnode', id: 'b2' });
		const model = serializer.serializeProperty(property(iri(`${EXAMPLE_NAMESPACE}p`, 'ex:p'), [first, iri(`${EXAMPLE_NAMESPACE}a`, 'ex:a'), second]));

		expect(model.text).toBe('ex:p […] ex:a […]');
		expect(model.placeholders).toEqual([first, second]);
	});

	it('keeps Turtle escapes on the line', () => {
		expect(serializer.serializeProperty(property(iri(`${EXAMPLE_NAMESPACE}p`, 'ex:p'), [literal('say "hi"\n\\')])).text).toBe('ex:p "say \\"hi\\"\\n\\\\"');
	});
});

describe('LineSerializer.serializeValue', () => {
	it('writes a value without collecting anything', () => {
		expect(serializer.serializeValue(view({ kind: 'bnode', id: 'b1' }))).toBe('[…]');
		expect(serializer.serializeValue(literal('x'))).toBe('"x"');
	});
});

describe('LineSerializer.toStatementText', () => {
	it('puts commas between the top-level values only', () => {
		expect(serializer.toStatementText('a owl:Class owl:Thing')).toBe('a owl:Class, owl:Thing');
		expect(serializer.toStatementText('rdfs:range ( ex:a ex:b ) ex:c')).toBe('rdfs:range ( ex:a ex:b ), ex:c');
		expect(serializer.toStatementText('rdfs:label "a, b"@en "c"')).toBe('rdfs:label "a, b"@en, "c"');
	});

	it('leaves predicate-only lines and comments alone', () => {
		expect(serializer.toStatementText('rdfs:label')).toBe('rdfs:label');
		expect(serializer.toStatementText('# c')).toBe('# c');
		expect(serializer.toStatementText('')).toBe('');
	});
});

describe('LineSerializer.escapeLiteral', () => {
	it('escapes quotes, backslashes and control characters', () => {
		expect(LineSerializer.escapeLiteral('a"b\\c\nd\te\r')).toBe('a\\"b\\\\c\\nd\\te\\r');
	});
});
