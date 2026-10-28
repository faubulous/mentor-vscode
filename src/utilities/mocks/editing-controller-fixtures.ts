import { EditOperation } from '@src/services/editing/edit-operation';
import { CellKey } from '@src/views/webviews/views/form-editor/state/cell-key';
import { IEditingController } from '@src/views/webviews/views/form-editor/state/editing-controller.interface';
import { EditingState } from '@src/views/webviews/views/form-editor/state/editing-state';

/**
 * An edit handed to the controller stub.
 */
interface SubmittedEditRecord {
	/**
	 * The operations of the edit.
	 */
	operations: EditOperation[];

	/**
	 * The cell the edit was made from.
	 */
	cellKey: CellKey;

	/**
	 * The cell to focus once the edit shows.
	 */
	predictedFocus?: CellKey;
}

/**
 * An editing controller that records what the rows ask of it and applies nothing.
 */
export interface EditingControllerStub extends IEditingController {
	/**
	 * The edits submitted so far, in order.
	 */
	submitted: SubmittedEditRecord[];

	/**
	 * The cells whose errors were dismissed, in order.
	 */
	dismissed: CellKey[];

	/**
	 * The cells focus was requested for, in order.
	 */
	focusRequests: CellKey[];
}

/**
 * Make an editing controller that records what is asked of it.
 * @param state The editing state it shows.
 * @param namespaces Prefix to namespace IRI.
 * @returns The controller.
 */
export function createEditingControllerStub(state = EditingState.INITIAL, namespaces: Record<string, string> = {}): EditingControllerStub {
	const submitted: SubmittedEditRecord[] = [];
	const dismissed: CellKey[] = [];
	const focusRequests: CellKey[] = [];

	return {
		state,
		namespaces,
		submitted,
		dismissed,
		focusRequests,
		startEditing: () => undefined,
		stopEditing: () => undefined,
		submit: (operations, cellKey, predictedFocus) => submitted.push({ operations, cellKey, predictedFocus }),
		requestFocus: cellKey => focusRequests.push(cellKey),
		dismissError: cellKey => dismissed.push(cellKey),
		pendingEditsFor: () => []
	};
}
