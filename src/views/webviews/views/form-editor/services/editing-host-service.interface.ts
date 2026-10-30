import { EditOperation, EditRejectionReason } from '@src/services/editing/edit-operation';

/**
 * How an edit ended, with the document version after it: the version the edit produced, or the
 * version the host refused it against.
 */
export type EditOutcome =
	| { ok: true; version: number }
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
export interface IEditingHostService {
	/**
	 * Apply the operations of one user action as one undo step.
	 * @param operations The operations to apply.
	 * @param baseVersion The document version the operations were built from, whose offsets their
	 * anchors are; the host refuses them against any other version.
	 * @returns The submitted edit.
	 */
	applyEdit(operations: EditOperation[], baseVersion: number): SubmittedEdit;
}
