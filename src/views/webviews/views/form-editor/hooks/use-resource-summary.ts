import { useEffect } from 'react';
import { NamedNode } from '@rdfjs/types';
import { ResourceSummary } from '../form-editor-model';
import { IResourceDataService } from '../services/resource-data-service.interface';
import { useDataServiceUpdates } from './use-resource-statements';

/**
 * Read the summary that comes with the statements of a resource the snapshot does not list, such as
 * one read from the store, asking for it while it is not loaded for the current snapshot, and
 * re-render when it arrives.
 * @param service The data service the summary comes from.
 * @param resource The resource, or `undefined` when there is none to read.
 * @returns The summary, current or stale, or `undefined` while none came.
 */
export function useResourceSummary(service: IResourceDataService, resource: NamedNode | undefined): ResourceSummary | undefined {
	useDataServiceUpdates(service);

	// Asked on every render, so a new snapshot that drops the loaded summaries asks again; the
	// service ignores what is loaded, asked or unknown already.
	useEffect(() => {
		if (resource && !service.getStatements(resource)) {
			service.request([resource]);
		}
	});

	return resource ? service.getSummary?.(resource) : undefined;
}
