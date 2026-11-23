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

	it('reads the text of a literal as a prefixed name, an <iri> or a bare IRI', () => {
		expect(reader.readResourceText(' ex:Tree ')).toEqual({ term: RdfDataFactory.namedNode(`${EXAMPLE_NAMESPACE}Tree`) });
		expect(reader.readResourceText('<http://other.org/x>')).toEqual({ term: RdfDataFactory.namedNode('http://other.org/x') });
		expect(reader.readResourceText('https://other.org/x')).toEqual({ term: RdfDataFactory.namedNode('https://other.org/x') });
		expect(reader.readResourceText('urn:isbn:0451450523')).toEqual({ term: RdfDataFactory.namedNode('urn:isbn:0451450523') });
		expect(reader.readResourceText('foo:x').problem).toEqual({ kind: 'undeclaredPrefix', prefix: 'foo' });
		expect(reader.readResourceText('a tree').problem).toEqual({ kind: 'notAName' });
	});
});
