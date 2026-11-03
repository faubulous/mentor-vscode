/**
 * Messages exchanged between the form editor host and its webview. Every message that carries
 * document data is stamped with the text document version it was built from, so the webview can
 * discard anything it receives out of order. Free of imports from 'vscode'.
 */

import type { EditOperation } from '@src/services/editing/edit-operation';
import type { EditProblem } from '@src/services/editing/edit-problem';
import type { ExecuteCommandMessage } from '../../webview-messaging';
import type { BlankNode, NamedNode } from '@rdfjs/types';
import type { DocumentPosition, DocumentSnapshot, ResourceDetail } from './form-editor-model';

/**
 * Messages sent from the extension host to the webview.
 */
export type FormEditorHostMessage =
	/**
	 * The document, rebuilt after it changed.
	 */
	| { id: 'DocumentSnapshot'; snapshot: DocumentSnapshot }
	/**
	 * The properties of the resources the webview asked for, built for the snapshot of `revision`;
	 * `missing` names those the document no longer describes.
	 */
	| { id: 'ResourcesLoaded'; revision: number; resources: ResourceDetail[]; missing: (NamedNode | BlankNode)[] }
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
	| { id: 'FilterResources'; label: string; resources: (NamedNode | BlankNode)[] };

/**
 * Messages sent from the webview to the extension host.
 */
export type FormEditorWebviewMessage =
	/**
	 * The webview drew for the first time and can receive a snapshot.
	 */
	| { id: 'Ready' }
	/**
	 * The properties of the resources about to be shown.
	 */
	| { id: 'RequestResources'; resources: (NamedNode | BlankNode)[] }
	/**
	 * The operations of one user action, to apply as one undo step against `baseVersion`.
	 */
	| { id: 'ApplyEdit'; editId: string; baseVersion: number; operations: EditOperation[] }
	/**
	 * Show a position of the document in a text editor beside the form.
	 */
	| { id: 'RevealInTextEditor'; position: DocumentPosition }
	| ExecuteCommandMessage;

/**
 * The union of all form editor messages.
 */
export type FormEditorMessages = FormEditorHostMessage | FormEditorWebviewMessage;
