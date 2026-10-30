import { TermRef, TermView } from '../form-editor-model';

/**
 * The text a term is told by when the pointer rests on it: the IRI of a resource, `_:` and the
 * label of a blank node.
 * @param term The term.
 * @returns The text, or `undefined` for a literal.
 */
export function getTermTitle(term: TermRef): string | undefined {
	if (term.kind === 'iri') {
		return term.iri;
	}

	return term.kind === 'bnode' ? `_:${term.id}` : undefined;
}

/**
 * The label a term is shown by: its label, else its prefixed name, else its IRI.
 * @param view The view of the term.
 * @returns The label.
 */
export function getTermLabel(view: TermView): string {
	return view.label || view.prefixedName || getTermTitle(view.term) || '';
}
