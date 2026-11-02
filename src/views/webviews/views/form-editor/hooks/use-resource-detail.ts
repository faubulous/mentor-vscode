import { useEffect, useState } from 'react';
import { BlankNode, NamedNode } from '@rdfjs/types';
import { ResourceDetail } from '../form-editor-model';
import { IResourceDataService } from '../services/resource-data-service.interface';

/**
 * The detail of a resource together with whether it belongs to a superseded document version.
 */
export interface ResourceDetailState {
	/**
	 * The detail, when the service has any.
	 */
	detail?: ResourceDetail;

	/**
	 * Whether the detail belongs to the previous document version.
	 */
	stale: boolean;
}

/**
 * Read the detail of a resource and re-render when the service loads new data. While the detail
 * for the current version is loading, the detail of the previous version is returned as stale,
 * so an open card keeps its rows and the cell being edited keeps its focus.
 * @param service The data service.
 * @param resource The resource.
 * @returns The detail and whether it is stale.
 */
export function useResourceDetail(service: IResourceDataService, resource: NamedNode | BlankNode): ResourceDetailState {
	const [, setRevision] = useState(0);

	useEffect(() => service.subscribe(() => setRevision(revision => revision + 1)), [service]);

	const detail = service.get(resource);

	if (detail) {
		return { detail, stale: false };
	}

	return { detail: service.getStale?.(resource), stale: true };
}
