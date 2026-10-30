import { EditOperation } from '@src/services/editing/edit-operation';
import { ResourceId } from '../form-editor-model';
import { EditOutcome } from '../services/editing-host-service.interface';
import { CellKey } from './cell-key';
import { EditingState } from './editing-state';
import { PendingEdit } from './pending-edits';

/**
 * What the editable rows need from whoever hosts them: the editing state, and the means to hand an
 * edit over and show its outcome. The form editor implements it over the webview message channel;
 * a host without write-back provides none, and the form is read-only.
 */
export interface IEditingController {
	/**
	 * The transient state of editing: the row to focus and the errors shown under rows.
	 */
	readonly state: EditingState;

	/**
	 * Hand the operations of one user action to the host.
	 * @param operations The operations.
	 * @param cellKey The row the action was made from, where a failure is reported.
	 * @param baseVersion The document version the operations were built from.
	 * @param predictedFocus The row to focus once the edit shows, unless the host names one.
	 * @returns How the edit ended.
	 */
	submit(operations: EditOperation[], cellKey: CellKey, baseVersion: number, predictedFocus?: CellKey): Promise<EditOutcome>;

	/**
	 * Move the focus to a row once it exists.
	 * @param cellKey The row.
	 */
	requestFocus(cellKey: CellKey): void;

	/**
	 * Remove the error shown under a row.
	 * @param cellKey The row.
	 */
	dismissError(cellKey: CellKey): void;

	/**
	 * Get the edits of a resource the rows do not show yet.
	 * @param resourceId The resource.
	 * @returns The pending edits.
	 */
	pendingEditsFor(resourceId: ResourceId): PendingEdit[];
}
