import { Literal, Quad, Term } from '@rdfjs/types';
import { RdfDataFactory } from './rdf-data-factory';

/**
 * The term types of RDF/JS.
 */
const TERM_TYPES = new Set(['NamedNode', 'BlankNode', 'Literal', 'Variable', 'DefaultGraph', 'Quad']);

/**
 * Turn the RDF/JS terms in a message that crossed the boundary between the extension host and a
 * webview back into terms. Messages are copied as plain data, so a term arrives as an object with
 * its fields but without its methods, such as `equals`. Every object with an RDF/JS `termType` is
 * replaced by a term of `rdf-data-factory`, the terms inside it first; other objects and arrays
 * are revived in place.
 * @param value The message, or any value in it.
 * @returns The value with its terms revived.
 */
export function reviveTerms<T>(value: T): T {
	if (Array.isArray(value)) {
		for (let i = 0; i < value.length; i++) {
			value[i] = reviveTerms(value[i]);
		}

		return value;
	}

	if (value === null || typeof value !== 'object') {
		return value;
	}

	const record = value as Record<string, unknown>;

	// The terms inside a term, the datatype of a literal and the terms of a quad, are revived
	// first, as the data factory compares them when it copies the term.
	for (const key of Object.keys(record)) {
		record[key] = reviveTerms(record[key]);
	}

	return _isTerm(value) ? copyTerm(value) as T : value;
}

/**
 * Copy a term into a term of `rdf-data-factory`, which holds the data of the term only. Unlike
 * `fromTerm` of the factory, which leaves it out, the base direction of a literal is kept, also
 * in the terms of a quad.
 * @param term The term.
 * @returns The copy.
 */
export function copyTerm<T extends Term>(term: T): T {
	if (term.termType === 'Literal' && (term as Literal).direction) {
		const literal = term as Literal;

		return RdfDataFactory.literal(literal.value, { language: literal.language, direction: literal.direction! }) as unknown as T;
	}

	if (term.termType === 'Quad') {
		const quad = term as unknown as Quad;

		return RdfDataFactory.quad(copyTerm(quad.subject), copyTerm(quad.predicate), copyTerm(quad.object), copyTerm(quad.graph)) as unknown as T;
	}

	return RdfDataFactory.fromTerm(term);
}

/**
 * Tell whether a value has the shape of an RDF/JS term.
 * @param value The value.
 * @returns Whether it is a term.
 */
function _isTerm(value: object): value is Term {
	const termType = (value as { termType?: unknown }).termType;

	return typeof termType === 'string' && TERM_TYPES.has(termType);
}
