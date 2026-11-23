import { describe, expect, it } from 'vitest';
import { RDF } from '@faubulous/mentor-rdf';
import { SparqlLexer, TurtleLexer } from '@faubulous/mentor-rdf-parsers';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { getTermSearchTarget, TermSearchTarget } from './term-search-target';

const EX = 'http://example.org/';

const NAMESPACES = { ex: EX };

const PREAMBLE = `@prefix ex: <${EX}> .\n`;

/**
 * What a completion searches for after a text, as typed up to the word being completed.
 * @param before The text before the word.
 * @param lexer The lexer of the syntax.
 * @returns The target.
 */
function targetAfter(before: string, lexer: { tokenize: (text: string) => { tokens: never[] } } = new TurtleLexer() as never): TermSearchTarget | undefined {
	const { tokens } = lexer.tokenize(before);

	return getTermSearchTarget(tokens, tokens.length, NAMESPACES);
}

/**
 * The IRI of a term of the example namespace.
 * @param name The local name.
 * @returns The term.
 */
function ex(name: string) {
	return RdfDataFactory.namedNode(EX + name);
}

describe('getTermSearchTarget', () => {
	it('searches resources as the subject of a statement', () => {
		expect(targetAfter(PREAMBLE)).toEqual({ targetType: 'resource' });
		expect(targetAfter(`${PREAMBLE}ex:Oak ex:p ex:o .\n`)).toEqual({ targetType: 'resource' });
	});

	it('searches predicates for the subject after it and after a semicolon', () => {
		expect(targetAfter(`${PREAMBLE}ex:Oak `)).toEqual({ targetType: 'predicate', statement: { subject: ex('Oak') } });
		expect(targetAfter(`${PREAMBLE}ex:Oak ex:p ex:o , ex:q ;\n\t`)).toEqual({ targetType: 'predicate', statement: { subject: ex('Oak') } });
	});

	it('searches the values of the predicate as objects, after a comma too', () => {
		expect(targetAfter(`${PREAMBLE}ex:Oak ex:height `)).toEqual({ targetType: 'resource', statement: { subject: ex('Oak'), predicate: EX + 'height' } });
		expect(targetAfter(`${PREAMBLE}ex:Oak ex:p ex:a , `)).toEqual({ targetType: 'resource', statement: { subject: ex('Oak'), predicate: EX + 'p' } });
	});

	it('searches classes as the object of a or rdf:type', () => {
		expect(targetAfter(`${PREAMBLE}ex:Oak a `)).toEqual({ targetType: 'class', statement: { subject: ex('Oak'), predicate: RDF.type } });
		expect(targetAfter(`${PREAMBLE}ex:Oak <${RDF.type}> ex:A , `)).toEqual({ targetType: 'class', statement: { subject: ex('Oak'), predicate: RDF.type } });
	});

	it('searches datatypes after ^^', () => {
		expect(targetAfter(`${PREAMBLE}ex:Oak ex:planted "2024-02-29"^^`)).toEqual({ targetType: 'datatype' });
	});

	it('names no subject inside a blank node, and goes on with the statement around it after it', () => {
		expect(targetAfter(`${PREAMBLE}ex:Oak ex:leaf [ `)).toEqual({ targetType: 'predicate' });
		expect(targetAfter(`${PREAMBLE}ex:Oak ex:leaf [ ex:colour ex:Green ] ; `)).toEqual({ targetType: 'predicate', statement: { subject: ex('Oak') } });
		expect(targetAfter(`${PREAMBLE}ex:Oak ex:leaves ( ex:a `)).toEqual({ targetType: 'resource' });
	});

	it('completes nothing right after an object or inside a prefix declaration', () => {
		expect(targetAfter(`${PREAMBLE}ex:Oak ex:p ex:o `)).toBeUndefined();
		expect(targetAfter('@prefix ')).toBeUndefined();
	});

	it('reads the triple patterns of a SPARQL query, naming the predicate of an object where the subject is a variable', () => {
		const sparql = new SparqlLexer() as never;

		expect(targetAfter(`PREFIX ex: <${EX}>\nSELECT * WHERE { ex:Oak `, sparql)).toEqual({ targetType: 'predicate', statement: { subject: ex('Oak') } });
		expect(targetAfter(`PREFIX ex: <${EX}>\nSELECT * WHERE { ?tree a `, sparql)).toEqual({ targetType: 'class', statement: { subject: undefined, predicate: RDF.type } });
		expect(targetAfter(`PREFIX ex: <${EX}>\nSELECT * WHERE { ?tree ex:height `, sparql)).toEqual({ targetType: 'resource', statement: { subject: undefined, predicate: EX + 'height' } });
	});
});
