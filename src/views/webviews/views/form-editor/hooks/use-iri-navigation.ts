import { useCallback } from 'react';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { useFormEditorContext } from '../state/form-editor-context';

/**
 * Follow an IRI: to its card when the document describes the resource, and out of the editor
 * otherwise.
 * @returns The function that follows an IRI.
 */
export function useIriNavigation(): (iri: string) => void {
	const { resources, onRevealResource, onOpenExternal } = useFormEditorContext();

	return useCallback((iri: string) => {
		const resource = RdfDataFactory.namedNode(iri);

		if (resources?.some(summary => summary.term.equals(resource))) {
			onRevealResource?.(resource);
		} else {
			onOpenExternal?.(iri);
		}
	}, [resources, onRevealResource, onOpenExternal]);
}
