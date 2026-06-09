import { Term } from '@rdfjs/types';
import { Uri } from '@faubulous/mentor-rdf';
import { BindingsResult } from '@src/languages/sparql/services/sparql-query-state';

/**
 * Returns the plain-text representation of a term as it is displayed in the bindings
 * table. Mirrors the rendering in `bindings-table.tsx` so the filter matches what the
 * user actually sees: prefixed IRIs (`foaf:Person`), literal values, `_:blank` ids and
 * quads serialized as `s p o .`.
 * @param term The term to render, or `undefined` for an empty cell.
 * @param namespaceMap Maps namespace IRIs to prefixes for named-node prefixing.
 * @returns The displayed text of the term.
 */
export function getTermText(term: Term | undefined, namespaceMap?: Record<string, string>): string {
	if (!term) {
		return '';
	}

	switch (term.termType) {
		case 'NamedNode': {
			const namespaceIri = Uri.getNamespaceIri(term.value);
			const prefix = namespaceMap ? namespaceMap[namespaceIri] : undefined;

			return prefix !== undefined ? `${prefix}:${term.value.replace(namespaceIri, '')}` : term.value;
		}
		case 'BlankNode':
			return `_:${term.value}`;
		case 'Literal':
			return term.value;
		case 'Quad':
			return `${getTermText(term.subject, namespaceMap)} ${getTermText(term.predicate, namespaceMap)} ${getTermText(term.object, namespaceMap)} .`;
		default:
			return term.value ?? '';
	}
}

/**
 * Returns `true` if the term matches the (already lower-cased) search query. Matches the
 * displayed text and, for named nodes, also the full IRI so both prefixed and full forms
 * are searchable.
 */
function termMatches(term: Term | undefined, namespaceMap: Record<string, string> | undefined, query: string): boolean {
	if (!term) {
		return false;
	}

	if (getTermText(term, namespaceMap).toLowerCase().includes(query)) {
		return true;
	}

	return term.termType === 'NamedNode' && term.value.toLowerCase().includes(query);
}

/**
 * Filters a bindings result to the rows that contain the search string in any of their
 * bindings, preserving the original result order. Returns the input result unchanged when
 * the query is empty so callers can rely on a stable object identity (e.g. for paging).
 * @param result The bindings result to filter.
 * @param query The search string.
 * @returns A bindings result with the matching rows, or the original result when the query is empty.
 */
export function filterBindings(result: BindingsResult, query: string): BindingsResult {
	const normalized = query.trim().toLowerCase();

	if (!normalized) {
		return result;
	}

	const rows = result.rows.filter(row =>
		result.columns.some(column => termMatches(row[column], result.namespaceMap, normalized))
	);

	return { ...result, rows };
}
