import { BlankNode, NamedNode } from '@rdfjs/types';
import { termToString } from 'rdf-string';
import { ResourceCardBodyData, ResourceCardHeaderData } from '@src/views/webviews/views/form-editor/form-editor-model';
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
 * @param cardBodies The statements it holds.
 * @param cardHeaders The card headers that came with them, as for resources of the store.
 * @returns The service.
 */
export function createResourceDataServiceStub(cardBodies: readonly ResourceCardBodyData[] = [], cardHeaders: readonly ResourceCardHeaderData[] = []): ResourceDataServiceStub {
	const byKey = new Map(cardBodies.map(resource => [termToString(resource.subject), resource]));
	const cardHeaderByKey = new Map(cardHeaders.map(cardHeader => [termToString(cardHeader.subject), cardHeader]));
	const requested: (NamedNode | BlankNode)[] = [];

	return {
		version: 1,
		requested,
		getCardBody: resource => byKey.get(termToString(resource)),
		getCardHeader: resource => cardHeaderByKey.get(termToString(resource)),
		request: resources => requested.push(...resources),
		subscribe: () => () => undefined
	};
}
