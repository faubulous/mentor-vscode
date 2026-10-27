import { Term } from '@rdfjs/types';
import { RDF, XSD } from '@faubulous/mentor-rdf';
import { TermRef } from './term-ref';
import { TermPattern } from './edit-plan';

/**
 * Convert an RDF/JS term into the pattern that matches it after a re-parse. Blank node
 * identifiers change between parses, so a blank node matches any blank node.
 * @param term The term to convert.
 */
export function toTermPattern(term: Term): TermPattern {
	switch (term.termType) {
		case 'BlankNode':
			return { kind: 'anyBlankNode' };
		case 'Literal': {
			const literal = term as { value: string; language?: string; datatype?: { value: string } };

			return {
				kind: 'literal',
				value: literal.value,
				language: literal.language || undefined,
				datatype: literal.language ? undefined : literal.datatype?.value
			};
		}
		default:
			return { kind: 'iri', iri: term.value };
	}
}

/**
 * Convert a wire term into a verification pattern.
 * @param term The term to convert.
 */
export function toPatternFromRef(term: TermRef): TermPattern {
	return term.kind === 'bnode' ? { kind: 'anyBlankNode' } : term;
}

/**
 * Indicate whether a term matches a pattern. Plain literals and `xsd:string` literals are the
 * same literal, and language tags compare case-insensitively.
 * @param term The term read from the document.
 * @param pattern The pattern to match against.
 */
export function matchesTermPattern(term: Term, pattern: TermPattern): boolean {
	switch (pattern.kind) {
		case 'anyBlankNode':
		case 'bnode':
			return term.termType === 'BlankNode';
		case 'iri':
			return term.termType === 'NamedNode' && term.value === pattern.iri;
		case 'literal': {
			if (term.termType !== 'Literal' || term.value !== pattern.value) {
				return false;
			}

			const literal = term as { language?: string; datatype?: { value: string } };

			if (pattern.language || literal.language) {
				return (pattern.language ?? '').toLowerCase() === (literal.language ?? '').toLowerCase();
			}

			return _normalizeDatatype(pattern.datatype) === _normalizeDatatype(literal.datatype?.value);
		}
		default:
			return false;
	}
}

/**
 * Treat a missing datatype as `xsd:string`, which is what a plain literal carries.
 */
function _normalizeDatatype(datatype: string | undefined): string {
	return !datatype || datatype === RDF.langString ? XSD.string : datatype;
}
