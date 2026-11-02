import { describe, expect, it } from 'vitest';
import { _RDF, _XSD, RDF, XSD } from '@faubulous/mentor-rdf';
import { RdfSyntax } from '@faubulous/mentor-rdf-parsers';
import { EditRejectionError } from './edit-rejection';
import { TermWriter, TermWriterOptions } from './term-writer';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';

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
		languageTags: {},
		...overrides
	});
}

describe('TermWriter', () => {
	describe('IRIs', () => {
		it('writes a prefixed name where the document declares the prefix', () => {
			expect(writer().writeIri(`${EX}a`)).toBe('ex:a');
			expect(writer().writeObject(RdfDataFactory.namedNode(`${EX}a`))).toBe('ex:a');
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
			expect(writer().writeLiteral(RdfDataFactory.literal('Tree'))).toBe('"Tree"');
		});

		it('writes a language tag the document writes in its spelling, and any other in lower case', () => {
			const spelled = writer({ languageTags: { 'en-us': 'en-US' } });

			expect(spelled.writeLiteral(RdfDataFactory.literal('Color', 'en-US'))).toBe('"Color"@en-US');
			expect(spelled.writeLiteral(RdfDataFactory.literal('Farbe', 'de-DE'))).toBe('"Farbe"@de-de');
		});

		it('writes language tags and datatypes', () => {
			expect(writer().writeLiteral(RdfDataFactory.literal('Tree', 'en'))).toBe('"Tree"@en');
			expect(writer().writeLiteral(RdfDataFactory.literal('x', RdfDataFactory.namedNode(`${EX}T`)))).toBe('"x"^^ex:T');
		});

		it('writes numbers and booleans bare where the syntax allows', () => {
			expect(writer().writeLiteral(RdfDataFactory.literal('42', RdfDataFactory.namedNode(XSD.integer)))).toBe('42');
			expect(writer().writeLiteral(RdfDataFactory.literal('4.2', RdfDataFactory.namedNode(XSD.decimal)))).toBe('4.2');
			expect(writer().writeLiteral(RdfDataFactory.literal('true', RdfDataFactory.namedNode(XSD.boolean)))).toBe('true');
		});

		it('quotes a number whose value is not a valid lexical form', () => {
			expect(writer().writeLiteral(RdfDataFactory.literal('abc', RdfDataFactory.namedNode(XSD.integer)))).toBe('"abc"^^xsd:integer');
		});

		it('writes typed literals in full in N-Triples', () => {
			expect(writer({ syntax: RdfSyntax.NTriples }).writeLiteral(RdfDataFactory.literal('42', RdfDataFactory.namedNode(XSD.integer)))).toBe(`"42"^^<${XSD.integer}>`);
		});

		it('escapes quotes and uses long strings for line breaks', () => {
			expect(writer().writeLiteral(RdfDataFactory.literal('a "b"'))).toBe('"a \\"b\\""');
			expect(writer().writeLiteral(RdfDataFactory.literal('one\ntwo'))).toBe('"""one\ntwo"""');
		});

		it('rejects an invalid language tag', () => {
			expect(() => writer().writeLiteral(RdfDataFactory.literal('x', 'en us'))).toThrow(EditRejectionError);
		});
	});

	describe('subjects', () => {
		it('rejects a literal as subject', () => {
			expect(() => writer().writeSubject(RdfDataFactory.literal('x'))).toThrow(EditRejectionError);
		});

		it('writes an IRI subject like an object', () => {
			expect(writer().writeSubject(RdfDataFactory.namedNode(`${EX}s`))).toBe('ex:s');
		});
	});
});
