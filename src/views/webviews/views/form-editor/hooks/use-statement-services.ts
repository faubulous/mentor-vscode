import { useMemo } from 'react';
import { ResourceDetail, TermView } from '../form-editor-model';
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
}

/**
 * Build the services of the statement rows of a card from the prefixes and resources of the
 * document and the views the host sent for the terms of the card.
 * @param detail The resource of the card.
 * @returns The services.
 */
export function useStatementServices(detail: ResourceDetail): StatementServices {
	const { namespaces, resources } = useFormEditorContext();
	const prefixes = useMemo(() => Object.fromEntries(namespaces.map(namespace => [namespace.prefix, namespace.iri])), [namespaces]);
	const reader = useMemo(() => new TypedTermReader(prefixes), [prefixes]);
	const resolver = useMemo(() => new TermViewResolver(prefixes, resources ?? [], _viewsOf(detail)), [prefixes, resources, detail]);

	return { reader, resolver };
}

/**
 * The views of the predicates and values of a resource.
 * @param detail The resource.
 * @returns The views.
 */
function _viewsOf(detail: ResourceDetail): TermView[] {
	return detail.properties.flatMap(property => [property.predicate, ...property.values]);
}
