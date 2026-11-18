import { useMemo } from 'react';
import { ResourceCardBodyData, TermData } from '../form-editor-model';
import { TermViewResolver } from '../services/statement/term-view-resolver';
import { TypedTermReader } from '../services/statement/typed-term-reader';
import { useFormEditorContext } from '../state/form-editor-context';

/**
 * The services the statement rows of a card read and show terms with.
 */
export interface StatementServices {
	/**
	 * Reads what is typed into a row.
	 */
	reader: TypedTermReader;

	/**
	 * Gives the terms of the rows their labels and glyphs.
	 */
	resolver: TermViewResolver;

	/**
	 * The languages the literals of the card are tagged with, in the order met, as the document
	 * spells them.
	 */
	languages: readonly string[];
}

/**
 * Build the services of the statement rows of a card from the prefixes and resources of the
 * document and the views the host sent for the terms of the card, with the languages of the card.
 * A card that only reads needs none, and is spared building them.
 * @param cardBody The resource of the card.
 * @param enabled Whether the rows of the card are edited.
 * @returns The services, or `undefined` when the rows are not edited.
 */
export function useStatementServices(cardBody: ResourceCardBodyData, enabled: boolean): StatementServices | undefined {
	const { namespaces, resources, languageTags } = useFormEditorContext();

	return useMemo(() => {
		if (!enabled) {
			return undefined;
		}

		const prefixes = Object.fromEntries(namespaces.map(namespace => [namespace.prefix, namespace.iri]));

		return {
			reader: new TypedTermReader(prefixes),
			resolver: new TermViewResolver(prefixes, resources ?? [], _viewsOf(cardBody)),
			languages: _languagesOf(cardBody).map(language => languageTags[language] ?? language)
		};
	}, [enabled, namespaces, resources, languageTags, cardBody]);
}

/**
 * The languages the literals of a resource are tagged with, each once, in the order met.
 * @param cardBody The resource.
 * @returns The languages.
 */
function _languagesOf(cardBody: ResourceCardBodyData): string[] {
	const languages = new Set<string>();

	for (const property of cardBody.predicates) {
		for (const value of property.values) {
			if (value.term.termType === 'Literal' && value.term.language) {
				languages.add(value.term.language);
			}
		}
	}

	return Array.from(languages);
}

/**
 * The views of the predicates and values of a resource.
 * @param cardBody The resource.
 * @returns The views.
 */
function _viewsOf(cardBody: ResourceCardBodyData): TermData[] {
	return cardBody.predicates.flatMap(property => [property.predicate, ...property.values]);
}
