import { Literal, Term } from '@rdfjs/types';
import { RDF, XSD } from '@faubulous/mentor-rdf';

/**
 * The key a term is matched by when the statements before and after an edit are compared. It is no
 * identity: all blank nodes share one key, plain literals take the key of `xsd:string` ones, and the
 * default graph has the empty key. Blank nodes match alike because an edit can change their
 * identifiers: those of the nodes it writes are only known once the text is read again, and those
 * of the nodes after them follow their place in the text.
 * @param term The term, read from the document or expected by an edit.
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
