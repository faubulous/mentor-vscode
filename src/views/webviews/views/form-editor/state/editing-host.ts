import { EditOperation, EditRejectionReason } from '@src/services/editing/edit-operation';
import { FocusHint, ResourceId } from '../form-editor-model';

/**
 * How an edit ended.
 */
export type EditOutcome =
	| { ok: true; version: number; focus?: FocusHint; renamedIds: [ResourceId, ResourceId][] }
	| { ok: false; reason: EditRejectionReason; message: string; version: number };

/**
 * An edit that has been handed to the host.
 */
export interface SubmittedEdit {
	/**
	 * The identifier the edit is reported back by.
	 */
	editId: string;

	/**
	 * How the edit ends.
	 */
	outcome: Promise<EditOutcome>;
}

/**
 * The side of the editor that owns the document. The form editor implements it over the webview
 * message channel; another host, such as a sidebar of a visual editor, can implement it over
 * anything else. A host that cannot write back simply provides none, and the form is read-only.
 */
export interface EditingHost {
	/**
	 * The document version the host last reported.
	 */
	readonly version: number;

	/**
	 * Apply the operations of one user action as one undo step.
	 * @param operations The operations to apply.
	 * @returns The submitted edit.
	 */
	applyEdit(operations: EditOperation[]): SubmittedEdit;
}
