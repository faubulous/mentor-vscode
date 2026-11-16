import { BlankNode, NamedNode } from '@rdfjs/types';
import { termToString } from 'rdf-string';
import { ResourceStatements, ResourceSummary } from '@src/views/webviews/views/form-editor/form-editor-model';
import { IResourceDataService } from '@src/views/webviews/views/form-editor/services/resource-data-service.interface';

/**
 * A data service holding given statements, which remembers what was asked of it.
 */
export interface ResourceDataServiceStub extends IResourceDataService {
	/**
	 * The document version the statements belong to, which a test moves on as the host would.
	 */
	version: number;

	/**
	 * The resources requested so far, in order.
	 */
	requested: (NamedNode | BlankNode)[];
}

/**
 * Make a data service that holds the given statements and loads nothing else.
 * @param statements The statements it holds.
 * @param summaries The summaries that came with them, as for resources of the store.
 * @returns The service.
 */
export function createResourceDataServiceStub(statements: readonly ResourceStatements[] = [], summaries: readonly ResourceSummary[] = []): ResourceDataServiceStub {
	const byKey = new Map(statements.map(resource => [termToString(resource.subjectTerm), resource]));
	const summaryByKey = new Map(summaries.map(summary => [termToString(summary.term), summary]));
	const requested: (NamedNode | BlankNode)[] = [];

	return {
		version: 1,
		requested,
		getStatements: resource => byKey.get(termToString(resource)),
		getSummary: resource => summaryByKey.get(termToString(resource)),
		request: resources => requested.push(...resources),
		subscribe: () => () => undefined
	};
}
