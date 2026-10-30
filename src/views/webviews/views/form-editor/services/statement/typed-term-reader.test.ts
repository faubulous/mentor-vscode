import { describe, expect, it } from 'vitest';
import { RDF, XSD } from '@faubulous/mentor-rdf';
import { EXAMPLE_NAMESPACE, TEST_NAMESPACES } from '@src/utilities/mocks/statement-fixtures';
import { TypedTermReader } from './typed-term-reader';

const reader = new TypedTermReader(TEST_NAMESPACES);

describe('TypedTermReader', () => {
	it('reads prefixed names and IRI references as IRIs, and tells an undeclared prefix', () => {
		expect(reader.readIri('ex:Tree')).toEqual({ term: { kind: 'iri', iri: `${EXAMPLE_NAMESPACE}Tree` } });
		expect(reader.readIri(' <http://other.org/x> ')).toEqual({ term: { kind: 'iri', iri: 'http://other.org/x' } });
		expect(reader.readIri('foo:x').problem).toMatch(/'foo' is not declared/);
		expect(reader.readIri('a tree').problem).toMatch(/prefixed name or an <IRI>/);
	});

	it('reads a as rdf:type only in predicate position', () => {
		expect(reader.readPredicate('a')).toEqual({ term: { kind: 'iri', iri: RDF.type } });
		expect(reader.readIri('a').problem).toBeDefined();
	});

	it('reads a value by what the predicate takes', () => {
		expect(reader.readValue('ex:Tree', 'any')).toEqual({ term: { kind: 'iri', iri: `${EXAMPLE_NAMESPACE}Tree` } });
		expect(reader.readValue('ex:Tree', 'literal')).toEqual({ term: { kind: 'literal', value: 'ex:Tree' } });
		expect(reader.readValue('a tree', 'resource')?.problem).toMatch(/prefixed name/);
		expect(reader.readValue('a tree', 'any')).toEqual({ term: { kind: 'literal', value: 'a tree' } });
		expect(reader.readValue('   ', 'any')).toBeUndefined();
	});

	it('reads numbers and booleans as typed literals where the predicate takes more than text', () => {
		expect(reader.readValue('42', 'any')).toEqual({ term: { kind: 'literal', value: '42', datatype: XSD.integer } });
		expect(reader.readValue('-1.5', 'any')).toEqual({ term: { kind: 'literal', value: '-1.5', datatype: XSD.decimal } });
		expect(reader.readValue('3.6E3', 'any')).toEqual({ term: { kind: 'literal', value: '3.6E3', datatype: XSD.double } });
		expect(reader.readValue('true', 'any')).toEqual({ term: { kind: 'literal', value: 'true', datatype: XSD.boolean } });
		expect(reader.readValue('42', 'literal')).toEqual({ term: { kind: 'literal', value: '42' } });
	});

	it('takes text as typed, without reading quotes or escapes', () => {
		expect(reader.readValue('"quoted" \\n', 'any')).toEqual({ term: { kind: 'literal', value: '"quoted" \\n' } });
	});
});
