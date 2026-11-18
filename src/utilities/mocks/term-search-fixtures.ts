import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { ResourceOptionData, TermSearchKind } from '@src/views/webviews/views/form-editor/form-editor-model';
import { ITermSearchService } from '@src/views/webviews/views/form-editor/services/term-search-service.interface';
import { rankTermOptions } from '@src/views/webviews/views/form-editor/services/term-ranking';

/**
 * A term search over fixed terms, which records the texts searched.
 */
export interface TermSearchStub extends ITermSearchService {
	/**
	 * The texts searched, in order.
	 */
	searched: string[];
}

/**
 * Make the option of a term of the document.
 * @param iri The IRI of the term.
 * @param label The label of the term.
 * @param overrides Other fields of the option.
 * @returns The option.
 */
export function createTermOption(iri: string, label: string, overrides: Partial<ResourceOptionData> = {}): ResourceOptionData {
	return { subject: RdfDataFactory.namedNode(iri), label, source: 'document', ...overrides };
}

/**
 * Make a term search that answers with the given terms of each kind that match the text, ranked as
 * the host ranks them, and with the given languages of the workspace.
 * @param terms The terms of each kind.
 * @param languages The languages of the workspace, the most used first.
 * @returns The search.
 */
export function createTermSearchStub(terms: Partial<Record<TermSearchKind, readonly ResourceOptionData[]>>, languages: readonly string[] = []): TermSearchStub {
	const searched: string[] = [];

	return {
		searched,
		search: async (kind, text, limit) => {
			searched.push(text);

			return rankTermOptions(terms[kind] ?? [], text).slice(0, limit);
		},
		getWorkspaceLanguages: async () => [...languages]
	};
}
