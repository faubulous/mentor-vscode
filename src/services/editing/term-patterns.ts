import { Term } from '@rdfjs/types';
import { RDF, XSD } from '@faubulous/mentor-rdf';
import { TermRef } from './term-ref';
import { TermPattern } from './edit-plan';

/**
 * Convert an RDF/JS term into the pattern that matches it after a re-parse. Blank node
 * identifiers change between parses, so a blank node matches any blank node.
 * @param term The term to convert.
 * @returns The pattern matching the term.
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
 * @returns The pattern matching the term.
 */
export function toPatternFromRef(term: TermRef): TermPattern {
	return term.kind === 'bnode' ? { kind: 'anyBlankNode' } : term;
}

/**
 * Treat a missing datatype as `xsd:string`, which is what a plain literal carries.
 * @param datatype The datatype IRI of a literal, if any.
 * @returns The datatype IRI to compare by.
 */
function _normalizeDatatype(datatype: string | undefined): string {
	return !datatype || datatype === RDF.langString ? XSD.string : datatype;
}

/**
 * The key a term is compared by when the statements before and after an edit are compared: equal
 * for terms a pattern matches alike. Blank nodes, whose identifiers change when the edited text is
 * read again, share one key, plain literals take the key of `xsd:string` ones, and language tags
 * compare case-insensitively.
 * @param term The term read from the document.
 * @returns The key.
 */
export function getTermKey(term: Term): string {
	switch (term.termType) {
		case 'BlankNode':
			return '_:';
		case 'Literal': {
			const literal = term as { value: string; language?: string; datatype?: { value: string } };

			return _literalKey(literal.value, literal.language, literal.datatype?.value);
		}
		default:
			return `<${term.value}>`;
	}
}

/**
 * The key of the terms a pattern matches, as {@link getTermKey} gives it.
 * @param pattern The pattern.
 * @returns The key.
 */
export function getPatternKey(pattern: TermPattern): string {
	switch (pattern.kind) {
		case 'anyBlankNode':
		case 'bnode':
			return '_:';
		case 'literal':
			return _literalKey(pattern.value, pattern.language, pattern.datatype);
		default:
			return `<${pattern.iri}>`;
	}
}

/**
 * The key of a literal.
 * @param value The text of the literal.
 * @param language Its language tag, if any.
 * @param datatype Its datatype, if any.
 * @returns The key.
 */
function _literalKey(value: string, language: string | undefined, datatype: string | undefined): string {
	return language ? `${JSON.stringify(value)}@${language.toLowerCase()}` : `${JSON.stringify(value)}^^${_normalizeDatatype(datatype)}`;
}

