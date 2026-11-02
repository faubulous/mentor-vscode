import { Literal, Quad_Graph, Term } from '@rdfjs/types';
import { RDF, XSD } from '@faubulous/mentor-rdf';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { ANY_BLANK_NODE } from './any-blank-node';
import type { GraphPattern, TermPattern } from './edit-plan';

/**
 * Convert a term into the pattern that matches it after a re-parse. Blank node identifiers change
 * between parses, so a blank node matches any blank node.
 * @param term The term to convert.
 * @returns The pattern matching the term.
 */
export function toTermPattern(term: Term): TermPattern {
	return term.termType === 'BlankNode' ? ANY_BLANK_NODE : term;
}

/**
 * Convert the graph of a statement into the pattern that matches it after a re-parse.
 * @param graph The graph, the default graph when absent.
 * @returns The pattern matching the graph.
 */
export function toGraphPattern(graph: Quad_Graph | undefined): GraphPattern {
	return graph ? toTermPattern(graph) as GraphPattern : RdfDataFactory.defaultGraph();
}

/**
 * The key a term is matched by when the statements before and after an edit are compared: equal
 * for terms a pattern matches alike. It is no identity: blank nodes, whose identifiers change when
 * the edited text is read again, share one key, plain literals take the key of `xsd:string` ones,
 * and the default graph has the empty key.
 * @param term The term read from the document.
 * @returns The key.
 */
export function getMatchKey(term: Term): string {
	switch (term.termType) {
		case 'BlankNode':
			return '_:';
		case 'DefaultGraph':
			return '';
		case 'Literal':
			return _literalKey(term);
		default:
			return `<${term.value}>`;
	}
}

/**
 * The key of the terms a pattern matches, as {@link getMatchKey} gives it.
 * @param pattern The pattern.
 * @returns The key.
 */
export function getPatternMatchKey(pattern: TermPattern): string {
	return pattern.termType === 'AnyBlankNode' ? '_:' : getMatchKey(pattern);
}

/**
 * The key of a literal: its text with its language tag and direction, else with its datatype.
 * Language tags compare case-insensitively.
 * @param literal The literal.
 * @returns The key.
 */
function _literalKey(literal: Literal): string {
	const value = JSON.stringify(literal.value);

	if (literal.language) {
		return `${value}@${literal.language.toLowerCase()}${literal.direction ? `--${literal.direction}` : ''}`;
	}

	return `${value}^^${_normalizeDatatype(literal.datatype.value)}`;
}

/**
 * Treat `rdf:langString` like `xsd:string`, the datatype of a plain literal.
 * @param datatype The datatype IRI of a literal.
 * @returns The datatype IRI to compare by.
 */
function _normalizeDatatype(datatype: string): string {
	return datatype === RDF.langString ? XSD.string : datatype;
}
