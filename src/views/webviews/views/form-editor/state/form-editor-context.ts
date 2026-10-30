import { createContext, useContext } from 'react';
import { NamespaceInfo, ResourceSummary } from '../form-editor-model';
import { IEditingController } from './editing-controller.interface';

/**
 * Everything the resource components need that is not part of the data itself. Held in a context
 * so the components stay reusable outside the form editor.
 */
export interface FormEditorContextValue {
	/**
	 * Whether nothing can be edited. `true` whenever no {@link editing} controller is provided.
	 */
	readOnly: boolean;

	/**
	 * The means to edit. Absent for data that cannot be written back, such as a query result or
	 * a document with syntax errors, in which case every editing affordance stays hidden.
	 */
	editing?: IEditingController;

	/**
	 * The namespace declarations of the document.
	 */
	namespaces: NamespaceInfo[];

	/**
	 * The resources of the document, which the lines complete and label local terms from.
	 */
	resources?: ResourceSummary[];

	/**
	 * Scroll to a resource, used by nested blank node placeholders.
	 */
	onRevealResource?: (resourceId: string) => void;

	/**
	 * Open an IRI the document does not describe outside the editor.
	 */
	onOpenExternal?: (iri: string) => void;

	/**
	 * The resource last revealed, as from the definition tree, whose entry is marked until the
	 * form is used.
	 */
	revealedResourceId?: string;

	/**
	 * The type most definitions have, which their entries do not repeat.
	 */
	dominantTypeIri?: string;

	/**
	 * The text typed into the filter field, whose matches the entries mark.
	 */
	filterText?: string;
}

const DEFAULT_VALUE: FormEditorContextValue = {
	readOnly: true,
	namespaces: []
};

/**
 * The context the resource components read the form editor's state from.
 */
export const FormEditorContext = createContext<FormEditorContextValue>(DEFAULT_VALUE);

/**
 * Access the form editor context.
 * @returns The current context value.
 */
export function useFormEditorContext(): FormEditorContextValue {
	return useContext(FormEditorContext);
}
