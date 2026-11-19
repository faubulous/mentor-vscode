import { describe, expect, it } from 'vitest';
import { RDF } from '@faubulous/mentor-rdf';
import { EXAMPLE_NAMESPACE, TEST_NAMESPACES } from '@src/utilities/mocks/statement-fixtures';
import { TypedTermReader } from './typed-term-reader';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';

const reader = new TypedTermReader(TEST_NAMESPACES);

describe('TypedTermReader', () => {
	it('reads prefixed names and IRI references as IRIs, and tells an undeclared prefix', () => {
		expect(reader.readIri('ex:Tree')).toEqual({ term: RdfDataFactory.namedNode(`${EXAMPLE_NAMESPACE}Tree`) });
		expect(reader.readIri(' <http://other.org/x> ')).toEqual({ term: RdfDataFactory.namedNode('http://other.org/x') });
		expect(reader.readIri('foo:x').problem).toEqual({ kind: 'undeclaredPrefix', prefix: 'foo' });
		expect(reader.readIri('a tree').problem).toEqual({ kind: 'notAName' });
	});

	it('reads a as rdf:type only in predicate position', () => {
		expect(reader.readPredicate('a')).toEqual({ term: RdfDataFactory.namedNode(RDF.type) });
		expect(reader.readIri('a').problem).toBeDefined();
	});

	it('reads a value by what the predicate takes', () => {
		expect(reader.readValue('ex:Tree', 'any')).toEqual({ term: RdfDataFactory.namedNode(`${EXAMPLE_NAMESPACE}Tree`) });
		expect(reader.readValue('ex:Tree', 'literal')).toEqual({ term: RdfDataFactory.literal('ex:Tree') });
		expect(reader.readValue('a tree', 'resource')?.problem).toEqual({ kind: 'notAName' });
		expect(reader.readValue('a tree', 'any')).toEqual({ term: RdfDataFactory.literal('a tree') });
		expect(reader.readValue('   ', 'any')).toBeUndefined();
	});

	it.each(['42', '-1.5', '3.6E3', 'true'])('reads %s as a plain string, which its field suggests a datatype for', text => {
		expect(reader.readValue(text, 'any')).toEqual({ term: RdfDataFactory.literal(text) });
		expect(reader.readValue(text, 'literal')).toEqual({ term: RdfDataFactory.literal(text) });
	});

	it('takes text as typed, without reading quotes or escapes', () => {
		expect(reader.readValue('"quoted" \\n', 'any')).toEqual({ term: RdfDataFactory.literal('"quoted" \\n') });
	});
});
