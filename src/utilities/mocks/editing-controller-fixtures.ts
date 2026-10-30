import { EditOperation } from '@src/services/editing/edit-operation';
import { EditOutcome } from '@src/views/webviews/views/form-editor/services/editing-host-service.interface';
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
	 * The row the edit was made from.
	 */
	cellKey: CellKey;

	/**
	 * The document version the edit was built from.
	 */
	baseVersion: number;
}

/**
 * An editing controller that records what the rows hand it and lets the test decide how each
 * edit ends.
 */
export interface EditingControllerStub extends IEditingController {
	/**
	 * The edits submitted so far, in order.
	 */
	submitted: SubmittedEditRecord[];

	/**
	 * The rows whose errors were dismissed, in order.
	 */
	dismissed: CellKey[];

	/**
	 * End the oldest edit that has not ended yet.
	 * @param outcome How it ends; applied when omitted.
	 */
	settle(outcome?: EditOutcome): Promise<void>;
}

/**
 * Make an editing controller that records what is handed to it.
 * @param state The editing state it shows.
 * @returns The controller.
 */
export function createEditingControllerStub(state = EditingState.INITIAL): EditingControllerStub {
	const submitted: SubmittedEditRecord[] = [];
	const dismissed: CellKey[] = [];
	const pending: ((outcome: EditOutcome) => void)[] = [];

	return {
		state,
		submitted,
		dismissed,
		submit: (operations, cellKey, baseVersion) => {
			submitted.push({ operations, cellKey, baseVersion });

			return new Promise<EditOutcome>(resolve => pending.push(resolve));
		},
		settle: async (outcome = { ok: true, version: 2, renamedIds: [] }) => {
			pending.shift()?.(outcome);
			await Promise.resolve();
		},
		requestFocus: () => undefined,
		dismissError: cellKey => dismissed.push(cellKey),
		pendingEditsFor: () => []
	};
}
