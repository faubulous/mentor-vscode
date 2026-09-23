import { Term } from '@rdfjs/types';
import { BindingsResult } from '@src/languages/sparql/services/sparql-query-state';
import { getTermText } from '@src/languages/sparql/services/bindings-formatter';

/**
 * Returns `true` if the term matches the (already lower-cased) search query. Matches the
 * displayed text and, for named nodes, also the full IRI so both prefixed and full forms
 * are searchable. The table renders prefixed IRIs, so the displayed text is read in the
 * prefixed form to keep the filter matching what the user actually sees.
 */
function termMatches(term: Term | undefined, namespaceMap: Record<string, string> | undefined, query: string): boolean {
	if (!term) {
		return false;
	}

	if (getTermText(term, namespaceMap, 'prefixed').toLowerCase().includes(query)) {
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
