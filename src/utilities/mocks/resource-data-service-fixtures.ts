import { BlankNode, NamedNode } from '@rdfjs/types';
import { termToString } from 'rdf-string';
import { ResourceDetail } from '@src/views/webviews/views/form-editor/form-editor-model';
import { IResourceDataService } from '@src/views/webviews/views/form-editor/services/resource-data-service.interface';

/**
 * A data service holding given details, which remembers what was asked of it.
 */
export interface ResourceDataServiceStub extends IResourceDataService {
	/**
	 * The document version the details belong to, which a test moves on as the host would.
	 */
	version: number;

	/**
	 * The resources requested so far, in order.
	 */
	requested: (NamedNode | BlankNode)[];
}

/**
 * Make a data service that holds the given details and loads nothing else.
 * @param details The details it holds.
 * @returns The service.
 */
export function createResourceDataServiceStub(details: readonly ResourceDetail[] = []): ResourceDataServiceStub {
	const byKey = new Map(details.map(detail => [termToString(detail.term), detail]));
	const requested: (NamedNode | BlankNode)[] = [];

	return {
		version: 1,
		requested,
		get: resource => byKey.get(termToString(resource)),
		request: resources => requested.push(...resources),
		subscribe: () => () => undefined
	};
}
