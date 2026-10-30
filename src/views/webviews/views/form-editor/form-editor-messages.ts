/**
 * Messages exchanged between the form editor host and its webview. Every message that carries
 * document data is stamped with the text document version it was built from, so the webview can
 * discard anything it receives out of order. Free of imports from 'vscode'.
 */

import type { EditOperation, EditRejectionReason } from '@src/services/editing/edit-operation';
import type { ExecuteCommandMessage } from '../../webview-messaging';
import type { DocumentPosition, DocumentSnapshot, ResourceDetail, ResourceId } from './form-editor-model';

/**
 * Why a snapshot was sent, which tells the webview how much of its state to preserve.
 */
export type SnapshotCause = 'initial' | 'external' | 'formEdit' | 'settings' | 'language';

/**
 * Messages sent from the extension host to the webview.
 */
export type FormEditorHostMessage =
	/**
	 * The document, rebuilt after it changed; `editId` names the edit of the form that caused it.
	 */
	| { id: 'DocumentSnapshot'; cause: SnapshotCause; editId?: string; snapshot: DocumentSnapshot }
	/**
	 * The properties of the resources the webview asked for; `missing` names those the document
	 * no longer describes.
	 */
	| { id: 'ResourcesLoaded'; version: number; resources: ResourceDetail[]; missing: ResourceId[] }
	/**
	 * An edit of the form was applied, producing the given document version.
	 */
	| { id: 'EditApplied'; editId: string; version: number }
	/**
	 * An edit of the form was not applied.
	 */
	| { id: 'EditRejected'; editId: string; reason: EditRejectionReason; message: string; version: number }
	/**
	 * Scroll a resource into view.
	 */
	| { id: 'ScrollToResource'; resourceId: ResourceId }
	/**
	 * Narrow the list to what the definition tree lists under a node; `label` names the node.
	 */
	| { id: 'FilterResources'; label: string; resourceIds: ResourceId[] };

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
	| { id: 'RequestResources'; ids: ResourceId[] }
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
