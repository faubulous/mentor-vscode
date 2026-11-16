import { useEffect } from 'react';
import { NamedNode } from '@rdfjs/types';
import { ResourceCardHeaderData } from '../form-editor-model';
import { IResourceDataService } from '../services/resource-data-service.interface';
import { useDataServiceUpdates } from './use-resource-card-body';

/**
 * Read the card header that comes with the card body of a resource the snapshot does not list,
 * such as one read from the store, asking for it while it is not loaded for the current snapshot,
 * and re-render when it arrives.
 * @param service The data service the card header comes from.
 * @param resource The resource, or `undefined` when there is none to read.
 * @returns The card header, or `undefined` while none came.
 */
export function useResourceCardHeader(service: IResourceDataService, resource: NamedNode | undefined): ResourceCardHeaderData | undefined {
	useDataServiceUpdates(service);

	// Asked on every render, so a new snapshot that drops the loaded card bodies asks again; the
	// service ignores what is loaded, asked or unknown already.
	useEffect(() => {
		if (resource && !service.getCardBody(resource)) {
			service.request([resource]);
		}
	});

	return resource ? service.getCardHeader?.(resource) : undefined;
}
