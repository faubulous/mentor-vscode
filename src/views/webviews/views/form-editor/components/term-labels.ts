import { Literal, Term } from '@rdfjs/types';
import { TermView } from '../form-editor-model';

/**
 * The identifier a term is written by: the IRI of a resource, `_:` and the label of a blank node.
 * @param term The term.
 * @returns The identifier, or `undefined` for a literal.
 */
function _identifierOf(term: Term): string | undefined {
	if (term.termType === 'NamedNode') {
		return term.value;
	}

	return term.termType === 'BlankNode' ? `_:${term.value}` : undefined;
}

/**
 * The label a term is shown by: its label, else its prefixed name, else its IRI.
 * @param view The view of the term.
 * @returns The label.
 */
export function getTermLabel(view: TermView): string {
	return view.label || view.prefixedName || _identifierOf(view.term) || '';
}

/**
 * The language tag of a literal as the document spells it, with its base direction.
 * @param literal The literal.
 * @param languageTags The spelling of each language tag the document writes, by its lower case form.
 * @returns The tag, or `undefined` for a literal without a language.
 */
export function getLanguageTagLabel(literal: Literal, languageTags: Readonly<Record<string, string>>): string | undefined {
	if (!literal.language) {
		return undefined;
	}

	const spelling = languageTags[literal.language] ?? literal.language;

	return literal.direction ? `${spelling}--${literal.direction}` : spelling;
}
