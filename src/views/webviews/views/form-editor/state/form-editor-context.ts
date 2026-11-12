import { createContext, useContext } from 'react';
import { BlankNode, NamedNode } from '@rdfjs/types';
import { DocumentPosition, NamespaceInfo, ResourceSummary } from '../form-editor-model';
import { ScopeKey } from '@src/utilities/config-scope';
import { IEditingController } from './editing-controller.interface';
import { LanguageFilter } from './language-filter';

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
	 * The spelling of each language tag the document writes, by its lower case form, which
	 * language tags are shown in.
	 */
	languageTags: Record<string, string>;

	/**
	 * Which literal values the rows show: those of the language the document is read in, or all of
	 * them. All when absent.
	 */
	languageFilter?: LanguageFilter;

	/**
	 * The resources of the document, which the lines complete and label local terms from.
	 */
	resources?: ResourceSummary[];

	/**
	 * The label predicates Mentor is configured with, most preferred first: the label row of a card
	 * shows the most preferred one the resource has.
	 */
	labelPredicates?: readonly NamedNode[];

	/**
	 * The description predicates Mentor is configured with, whose values a collapsed card shows as
	 * text of its own.
	 */
	descriptionPredicates?: readonly NamedNode[];

	/**
	 * The settings a property can be pinned in, in the order the pin menu offers them: the user
	 * settings, and the workspace settings where a workspace is open.
	 */
	pinScopes?: readonly ScopeKey[];

	/**
	 * Pin a property of a resource on the cards of its types, or unpin it.
	 * @param resource The resource.
	 * @param predicate The predicate.
	 * @param scope Who to pin it for, or `undefined` to unpin it.
	 */
	onSetPin?: (resource: NamedNode | BlankNode, predicate: NamedNode, scope: ScopeKey | undefined) => void;

	/**
	 * Unpin every property pinned for a resource in a scope that can be written.
	 * @param resource The resource.
	 */
	onUnpinAll?: (resource: NamedNode | BlankNode) => void;

	/**
	 * Scroll to a resource, used by nested blank node placeholders.
	 */
	onRevealResource?: (resource: NamedNode | BlankNode) => void;

	/**
	 * Open an IRI the document does not describe outside the editor.
	 */
	onOpenExternal?: (iri: string) => void;

	/**
	 * Put the text of a blank node written in place on the clipboard, as Turtle.
	 * @param anchor The offset the node starts at.
	 * @param version The document version the offset belongs to.
	 */
	onCopyAsTurtle?: (anchor: number, version: number) => void;

	/**
	 * Rename a resource as F2 does: give it another IRI in its namespace, wherever the workspace
	 * writes it.
	 * @param resource The resource.
	 * @param iri The new IRI.
	 */
	onRenameResource?: (resource: NamedNode, iri: string) => void;

	/**
	 * Show a position of the document in a text editor beside the form.
	 */
	onRevealInTextEditor?: (position: DocumentPosition) => void;

	/**
	 * Remove a resource with all its statements from the document, once the user confirms it.
	 * @param resource The resource.
	 */
	onRemoveResource?: (resource: NamedNode | BlankNode) => void;

	/**
	 * The resource last revealed, as from the definition tree, whose entry is marked until the
	 * form is used.
	 */
	revealedResource?: NamedNode | BlankNode;

	/**
	 * The text typed into the filter field, whose matches the entries mark.
	 */
	filterText?: string;
}

const DEFAULT_VALUE: FormEditorContextValue = {
	readOnly: true,
	namespaces: [],
	languageTags: {}
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
