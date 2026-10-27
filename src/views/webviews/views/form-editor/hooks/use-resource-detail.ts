import { useEffect, useState } from 'react';
import { ResourceDetail, ResourceId } from '../form-editor-model';
import { ResourceDataProvider } from '../state/resource-data-provider';

/**
 * The detail of a resource together with whether it belongs to a superseded document version.
 */
export interface ResourceDetailState {
	/**
	 * The detail, when the provider has any.
	 */
	detail?: ResourceDetail;

	/**
	 * Whether the detail belongs to the previous document version.
	 */
	stale: boolean;
}

/**
 * Read the detail of a resource and re-render when the provider loads new data. While the detail
 * for the current version is loading, the detail of the previous version is returned as stale,
 * so an open card keeps its rows and the cell being edited keeps its focus.
 * @param provider The data provider.
 * @param id The resource.
 * @returns The detail and whether it is stale.
 */
export function useResourceDetail(provider: ResourceDataProvider, id: ResourceId): ResourceDetailState {
	const [, setRevision] = useState(0);

	useEffect(() => provider.subscribe(() => setRevision(revision => revision + 1)), [provider]);

	const detail = provider.get(id);

	if (detail) {
		return { detail, stale: false };
	}

	return { detail: provider.getStale?.(id), stale: true };
}
