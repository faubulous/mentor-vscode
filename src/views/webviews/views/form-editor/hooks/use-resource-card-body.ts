import { useEffect, useMemo, useState } from 'react';
import { BlankNode, NamedNode } from '@rdfjs/types';
import { ResourceCardBodyData } from '../form-editor-model';
import { IResourceDataService } from '../services/resource-data-service.interface';
import { useFormEditorContext } from '../state/form-editor-context';
import { getAssertedCardBody } from '@src/services/resource/inferred-statements';

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
 * card keeps its rows and the cell being edited keeps its focus. Those the reasoner inferred are
 * left out where the form does not show them.
 * @param service The data service.
 * @param resource The resource.
 * @returns The statements and whether they are stale.
 */
export function useResourceCardBody(service: IResourceDataService, resource: NamedNode | BlankNode): ResourceCardBodyState {
	useDataServiceUpdates(service);

	const { showInferred = true } = useFormEditorContext();
	const current = service.getCardBody(resource);
	const read = current ?? service.getStaleCardBody?.(resource);
	const cardBody = useMemo(() => read && !showInferred ? getAssertedCardBody(read) : read, [read, showInferred]);

	return { cardBody, stale: current === undefined };
}

/**
 * Re-render whenever a data service loads new data.
 * @param service The data service.
 */
export function useDataServiceUpdates(service: IResourceDataService): void {
	const [, setRevision] = useState(0);

	useEffect(() => service.subscribe(() => setRevision(revision => revision + 1)), [service]);
}
