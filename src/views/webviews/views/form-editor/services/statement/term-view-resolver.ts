import { getPrefixedName } from '@src/utilities/prefixed-name';
import { ResourceSummary, TermRef, TermView } from '../../form-editor-model';

/**
 * Gives every term a row shows the view the components render it with: the view the host sent
 * for a term the card names, else the label and glyph of a resource the document describes, else
 * the prefixed name the declared prefixes give it. A term typed in the form is shown the moment it
 * is typed, before the host has delivered a view of it.
 */
export class TermViewResolver {
	private readonly _views = new Map<string, TermView>();

	/**
	 * Create a resolver for a card.
	 * @param _namespaces Prefix to namespace IRI, as the document declares them.
	 * @param resources The resources of the document.
	 * @param known The views the host sent for the terms of the card.
	 */
	constructor(private readonly _namespaces: Readonly<Record<string, string>>, resources: readonly ResourceSummary[], known: readonly TermView[]) {
		for (const resource of resources) {
			if (resource.term.kind === 'iri') {
				this._views.set(resource.term.iri, { term: resource.term, label: resource.hasLabel ? resource.label : undefined, prefixedName: resource.prefixedName, iconName: resource.iconName, editable: false });
			}
		}

		for (const view of known) {
			if (view.term.kind === 'iri') {
				this._views.set(view.term.iri, view);
			}
		}
	}

	/**
	 * Get the view of a term.
	 * @param term The term.
	 * @returns The view, which carries no position: it stands for the term, not for where it is written.
	 */
	viewOf(term: TermRef): TermView {
		if (term.kind !== 'iri') {
			return { term, editable: false };
		}

		const known = this._views.get(term.iri);

		return {
			term,
			label: known?.label,
			labelLanguage: known?.labelLanguage,
			prefixedName: known?.prefixedName ?? getPrefixedName(this._namespaces, term.iri),
			iconName: known?.iconName,
			editable: false
		};
	}
}
