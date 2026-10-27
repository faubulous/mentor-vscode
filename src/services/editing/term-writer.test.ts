import { describe, expect, it } from 'vitest';
import { _RDF, _XSD, RDF, XSD } from '@faubulous/mentor-rdf';
import { RdfSyntax } from '@faubulous/mentor-rdf-parsers';
import { EditRejectionError } from './edit-rejection';
import { TermWriter, TermWriterOptions } from './term-writer';

const EX = 'http://example.org/';

/**
 * A writer for a Turtle document that declares the ex, rdf and xsd prefixes and writes `a`.
 */
function writer(overrides: Partial<TermWriterOptions> = {}): TermWriter {
	return new TermWriter({
		namespaces: { ex: EX, rdf: _RDF, xsd: _XSD },
		syntax: RdfSyntax.Turtle,
		useTypeKeyword: true,
		blankNodeLabels: new Map(),
		...overrides
	});
}

describe('TermWriter', () => {
	describe('IRIs', () => {
		it('writes a prefixed name where the document declares the prefix', () => {
			expect(writer().writeIri(`${EX}a`)).toBe('ex:a');
			expect(writer().writeObject({ kind: 'iri', iri: `${EX}a` })).toBe('ex:a');
		});

		it('writes a full IRI where no prefix matches', () => {
			expect(writer().writeIri('http://other.org/x')).toBe('<http://other.org/x>');
		});

		it('writes full IRIs in N-Triples, which has no prefixes', () => {
			expect(writer({ syntax: RdfSyntax.NTriples }).writeIri(`${EX}a`)).toBe(`<${EX}a>`);
		});

		it('rejects an IRI that cannot be written', () => {
			expect(() => writer().writeIri('http://example.org/a b')).toThrow(EditRejectionError);
		});
	});

	describe('predicates', () => {
		it('writes rdf:type as a when the document does', () => {
			expect(writer().writePredicate(RDF.type)).toBe('a');
		});

		it('writes rdf:type as a prefixed name when the document does', () => {
			expect(writer({ useTypeKeyword: false }).writePredicate(RDF.type)).toBe('rdf:type');
		});

		it('never writes a in N-Triples', () => {
			expect(writer({ syntax: RdfSyntax.NTriples }).writePredicate(RDF.type)).toBe(`<${RDF.type}>`);
		});
	});

	describe('literals', () => {
		it('writes plain strings quoted', () => {
			expect(writer().writeLiteral({ kind: 'literal', value: 'Tree' })).toBe('"Tree"');
		});

		it('writes language tags and datatypes', () => {
			expect(writer().writeLiteral({ kind: 'literal', value: 'Tree', language: 'en' })).toBe('"Tree"@en');
			expect(writer().writeLiteral({ kind: 'literal', value: 'x', datatype: `${EX}T` })).toBe('"x"^^ex:T');
		});

		it('writes numbers and booleans bare where the syntax allows', () => {
			expect(writer().writeLiteral({ kind: 'literal', value: '42', datatype: XSD.integer })).toBe('42');
			expect(writer().writeLiteral({ kind: 'literal', value: '4.2', datatype: XSD.decimal })).toBe('4.2');
			expect(writer().writeLiteral({ kind: 'literal', value: 'true', datatype: XSD.boolean })).toBe('true');
		});

		it('quotes a number whose value is not a valid lexical form', () => {
			expect(writer().writeLiteral({ kind: 'literal', value: 'abc', datatype: XSD.integer })).toBe('"abc"^^xsd:integer');
		});

		it('writes typed literals in full in N-Triples', () => {
			expect(writer({ syntax: RdfSyntax.NTriples }).writeLiteral({ kind: 'literal', value: '42', datatype: XSD.integer })).toBe(`"42"^^<${XSD.integer}>`);
		});

		it('escapes quotes and uses long strings for line breaks', () => {
			expect(writer().writeLiteral({ kind: 'literal', value: 'a "b"' })).toBe('"a \\"b\\""');
			expect(writer().writeLiteral({ kind: 'literal', value: 'one\ntwo' })).toBe('"""one\ntwo"""');
		});

		it('rejects an invalid language tag', () => {
			expect(() => writer().writeLiteral({ kind: 'literal', value: 'x', language: 'en us' })).toThrow(EditRejectionError);
		});
	});

	describe('subjects', () => {
		it('rejects a literal as subject', () => {
			expect(() => writer().writeSubject({ kind: 'literal', value: 'x' })).toThrow(EditRejectionError);
		});

		it('writes an IRI subject like an object', () => {
			expect(writer().writeSubject({ kind: 'iri', iri: `${EX}s` })).toBe('ex:s');
		});
	});
});
