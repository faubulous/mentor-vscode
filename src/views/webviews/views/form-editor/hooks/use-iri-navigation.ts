import { useCallback } from 'react';
import { getIriResourceId } from '@src/services/editing/resource-id';
import { useFormEditorContext } from '../state/form-editor-context';

/**
 * Follow an IRI: to its card when the document describes the resource, and out of the editor
 * otherwise.
 * @returns The function that follows an IRI.
 */
export function useIriNavigation(): (iri: string) => void {
	const { resources, onRevealResource, onOpenExternal } = useFormEditorContext();

	return useCallback((iri: string) => {
		const id = getIriResourceId(iri);

		if (resources?.some(resource => resource.id === id)) {
			onRevealResource?.(id);
		} else {
			onOpenExternal?.(iri);
		}
	}, [resources, onRevealResource, onOpenExternal]);
}
