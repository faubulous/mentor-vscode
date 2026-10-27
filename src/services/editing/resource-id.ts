import { Term } from '@rdfjs/types';
import { TermRef } from './term-ref';

/**
 * Identifier of a resource within one document revision. Blank node identifiers are assigned
 * by the parser in token order, so they are only valid for the revision they were built from.
 */
export type ResourceId = string;

/**
 * Build the identifier of a resource named by an IRI, as the form editor names its resources.
 * @param iri The IRI.
 * @returns The resource identifier.
 */
export function getIriResourceId(iri: string): ResourceId {
	return `i:${iri}`;
}

/**
 * Build the identifier of a resource. Blank node identifiers are assigned by the parser in
 * token order, so they are only stable within the revision they were built from.
 * @param term The subject or object term.
 * @returns The resource identifier.
 */
export function getResourceId(term: Term): ResourceId {
	return term.termType === 'BlankNode' ? `b:${term.value}` : getIriResourceId(term.value);
}

/**
 * Convert an RDF/JS term to its wire representation.
 * @param term The term to convert.
 * @returns The term in wire form.
 */
export function toTermRef(term: Term): TermRef {
	switch (term.termType) {
		case 'BlankNode':
			return { kind: 'bnode', id: term.value };
		case 'Literal': {
			const literal = term as { value: string; language?: string; datatype?: { value: string } };

			return {
				kind: 'literal',
				value: literal.value,
				language: literal.language || undefined,
				datatype: literal.datatype?.value
			};
		}
		default:
			return { kind: 'iri', iri: term.value };
	}
}
