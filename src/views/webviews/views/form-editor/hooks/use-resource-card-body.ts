import { useEffect, useState } from 'react';
import { BlankNode, NamedNode } from '@rdfjs/types';
import { ResourceCardBodyData } from '../form-editor-model';
import { IResourceDataService } from '../services/resource-data-service.interface';

/**
 * The statements about a resource together with whether they belong to a superseded snapshot.
 */
export interface ResourceCardBodyState {
	/**
	 * The statements, when the service has any.
	 */
	cardBody?: ResourceCardBodyData;

	/**
	 * Whether the statements belong to the previous snapshot.
	 */
	stale: boolean;
}

/**
 * Read the statements about a resource and re-render when the service loads new data. While those
 * of the current snapshot are loading, those of the previous one are returned as stale, so an open
 * card keeps its rows and the cell being edited keeps its focus.
 * @param service The data service.
 * @param resource The resource.
 * @returns The statements and whether they are stale.
 */
export function useResourceCardBody(service: IResourceDataService, resource: NamedNode | BlankNode): ResourceCardBodyState {
	useDataServiceUpdates(service);

	const cardBody = service.getCardBody(resource);

	if (cardBody) {
		return { cardBody, stale: false };
	}

	return { cardBody: service.getStaleCardBody?.(resource), stale: true };
}

/**
 * Re-render whenever a data service loads new data.
 * @param service The data service.
 */
export function useDataServiceUpdates(service: IResourceDataService): void {
	const [, setRevision] = useState(0);

	useEffect(() => service.subscribe(() => setRevision(revision => revision + 1)), [service]);
}
