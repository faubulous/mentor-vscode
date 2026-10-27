import { EditOperation } from '@src/services/editing/edit-operation';
import { ResourceId } from '../form-editor-model';
import { CellKey } from './cell-key';
import { EditingState } from './editing-state';
import { PendingEdit } from './pending-edits';

/**
 * What the editing components need from whoever hosts them: the editing state, and the means to
 * open an editor, hand an edit over and show its outcome. The form editor implements it over the
 * webview message channel; a host without write-back provides none, and the form is read-only.
 */
export interface IEditingController {
	/**
	 * The transient state of editing.
	 */
	readonly state: EditingState;

	/**
	 * Prefix to namespace IRI, for reading typed prefixed names.
	 */
	readonly namespaces: Record<string, string>;

	/**
	 * Open the editor of a cell.
	 * @param cellKey The cell.
	 * @param mode Whether to start from the current text or from the seed.
	 * @param seed The text typed to open the editor, in replace mode.
	 */
	startEditing(cellKey: CellKey, mode: 'append' | 'replace', seed?: string): void;

	/**
	 * Close the open editor without applying anything.
	 * @param cellKey When given, the editor only closes if this cell is the one being edited.
	 */
	stopEditing(cellKey?: CellKey): void;

	/**
	 * Hand the operations of one user action to the host.
	 * @param operations The operations.
	 * @param cellKey The cell the action was made from, where a failure is reported.
	 * @param predictedFocus The cell to focus once the edit shows, unless the host says otherwise.
	 */
	submit(operations: EditOperation[], cellKey: CellKey, predictedFocus?: CellKey): void;

	/**
	 * Move the focus to a cell once it exists.
	 * @param cellKey The cell.
	 */
	requestFocus(cellKey: CellKey): void;

	/**
	 * Remove the error shown for a cell.
	 * @param cellKey The cell.
	 */
	dismissError(cellKey: CellKey): void;

	/**
	 * Get the edits of a resource the rows do not show yet.
	 * @param resourceId The resource.
	 * @returns The pending edits.
	 */
	pendingEditsFor(resourceId: ResourceId): PendingEdit[];
}
