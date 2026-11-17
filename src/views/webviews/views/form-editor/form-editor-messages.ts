/**
 * Messages exchanged between the form editor host and its webview. Every message that carries
 * document data is stamped with the text document version it was built from, so the webview can
 * discard anything it receives out of order. Free of imports from 'vscode'.
 */

import type { EditOperation } from '@src/services/editing/edit-operation';
import type { EditProblem } from '@src/services/editing/edit-problem';
import type { ExecuteCommandMessage } from '../../webview-messaging';
import type { BlankNode, NamedNode } from '@rdfjs/types';
import type { DocumentPosition, DocumentSnapshot, ResourceCardBodyData, ResourceSource, ResourceCardHeaderData, ResourceOptionData, TermSearchKind } from './form-editor-model';
import type { ScopeKey } from '@src/utilities/config-scope';

/**
 * Messages sent from the extension host to the webview.
 */
export type FormEditorHostMessage =
	/**
	 * The document, rebuilt after it changed.
	 */
	| { id: 'DocumentSnapshot'; snapshot: DocumentSnapshot }
	/**
	 * The answer to a {@link FormEditorWebviewMessage} `ResourceRequest`, built for the snapshot of
	 * `revision` from the source asked: the card bodies of the resources it describes, the card
	 * headers of those the snapshot does not list (blank nodes written inside another resource,
	 * resources of the store), and the resources it does not describe as `missing`.
	 */
	| { id: 'ResourceResponse'; revision: number; cardBodies: ResourceCardBodyData[]; cardHeaders?: ResourceCardHeaderData[]; missing: (NamedNode | BlankNode)[]; source?: ResourceSource }
	/**
	 * An edit of the form was applied, producing the given document version.
	 */
	| { id: 'EditApplied'; editId: string; version: number }
	/**
	 * An edit of the form was not applied.
	 */
	| { id: 'EditRejected'; editId: string; problem: EditProblem; version: number }
	/**
	 * Scroll the card of a resource into view.
	 */
	| { id: 'ScrollToResource'; resource: NamedNode | BlankNode }
	/**
	 * Narrow the list to the cards of what the definition tree lists under a node; `label` names
	 * the node.
	 */
	| { id: 'FilterResources'; label: string; resources: (NamedNode | BlankNode)[] }
	/**
	 * A language was chosen in the language quick pick, or the values of every language.
	 */
	| { id: 'LanguagePicked'; allLanguages: boolean }
	/**
	 * A resource was renamed: its IRI is now `renamed`.
	 */
	| { id: 'ResourceRenamed'; resource: NamedNode; renamed: NamedNode }
	/**
	 * The answer to a {@link FormEditorWebviewMessage} `TermSearch`: the terms that match, best first.
	 */
	| { id: 'TermSearchResult'; requestId: number; options: ResourceOptionData[] };

/**
 * Messages sent from the webview to the extension host.
 */
export type FormEditorWebviewMessage =
	/**
	 * The webview drew for the first time and can receive a snapshot.
	 */
	| { id: 'Ready' }
	/**
	 * A request for the statements about the resources about to be shown, read from the document
	 * unless the store is asked; the host answers with a `ResourceResponse`.
	 */
	| { id: 'ResourceRequest'; resources: (NamedNode | BlankNode)[]; source?: ResourceSource }
	/**
	 * The operations of one user action, to apply as one undo step against `baseVersion`.
	 */
	| { id: 'ApplyEdit'; editId: string; baseVersion: number; operations: EditOperation[] }
	/**
	 * Show a position of the document in a text editor beside the form.
	 */
	| { id: 'RevealInTextEditor'; position: DocumentPosition }
	/**
	 * Let the user choose the language the document is read in, as Mentor's language selection
	 * does, or the values of every language; `allLanguages` tells whether those are shown now.
	 */
	| { id: 'PickLanguage'; allLanguages: boolean }
	/**
	 * Rename a resource as F2 does: give it another IRI in its namespace, wherever the workspace
	 * writes it.
	 */
	| { id: 'RenameResource'; resource: NamedNode; iri: string }
	/**
	 * Pin a property of a resource for the types of the resource, for oneself or for everyone, or
	 * unpin it when no scope is given.
	 */
	| { id: 'SetPin'; resource: NamedNode | BlankNode; predicate: NamedNode; scope?: ScopeKey }
	/**
	 * Unpin every property pinned for a resource in a scope that can be written.
	 */
	| { id: 'UnpinAll'; resource: NamedNode | BlankNode }
	/**
	 * Remove a resource with all its statements from the document, once the user confirms it.
	 */
	| { id: 'RemoveResource'; resource: NamedNode | BlankNode }
	/**
	 * Search the terms of a kind the workspace knows for typed text, at most `limit` of them; the
	 * host answers with a `TermSearchResult` of the same `requestId`.
	 */
	| { id: 'TermSearch'; requestId: number; kind: TermSearchKind; text: string; limit: number }
	| ExecuteCommandMessage;

/**
 * The union of all form editor messages.
 */
export type FormEditorMessages = FormEditorHostMessage | FormEditorWebviewMessage;
