import { EditRejectionReason } from '@src/services/editing/edit-operation';
import { ResourceId } from '../form-editor-model';
import { CellKey } from './cell-key';

/**
 * Why an edit of a row failed, kept until the user dismisses it.
 */
export interface CellError {
	/**
	 * The row the error is shown for.
	 */
	cellKey: CellKey;

	/**
	 * The explanation shown to the user.
	 */
	message: string;

	/**
	 * Why the edit was not applied, when the host said.
	 */
	reason?: EditRejectionReason;
}

/**
 * The transient state of editing: the row to focus once it exists, and the errors shown under
 * rows. Immutable: every transition returns the next state, or the state itself when nothing
 * changes, so React can tell the two apart.
 */
export class EditingState {
	/**
	 * The state before anything is edited.
	 */
	static readonly INITIAL = new EditingState();

	/**
	 * Create a state.
	 * @param focusRequest The row to focus once it exists, after an edit re-rendered the rows.
	 * @param errors The errors shown, by the text form of the key of their row.
	 */
	constructor(
		readonly focusRequest?: CellKey,
		readonly errors: ReadonlyMap<string, CellError> = new Map()
	) { }

	/**
	 * Ask for the focus to move to a row once it exists.
	 * @param cellKey The row.
	 * @returns The next state.
	 */
	requestFocus(cellKey: CellKey): EditingState {
		return new EditingState(cellKey, this.errors);
	}

	/**
	 * Note that the requested focus was given.
	 * @returns The next state, the state itself when no focus was requested.
	 */
	focusFulfilled(): EditingState {
		return this.focusRequest ? new EditingState(undefined, this.errors) : this;
	}

	/**
	 * Show an error under a row.
	 * @param cellKey The row.
	 * @param message The explanation shown to the user.
	 * @param reason Why the edit was not applied, when the host said.
	 * @returns The next state.
	 */
	withError(cellKey: CellKey, message: string, reason?: EditRejectionReason): EditingState {
		const errors = new Map(this.errors);

		errors.set(cellKey.toString(), { cellKey, message, reason });

		return new EditingState(this.focusRequest, errors);
	}

	/**
	 * Remove the error shown under a row.
	 * @param cellKey The row.
	 * @returns The next state, the state itself when the row had no error.
	 */
	withoutError(cellKey: CellKey): EditingState {
		if (!this.errors.has(cellKey.toString())) {
			return this;
		}

		const errors = new Map(this.errors);

		errors.delete(cellKey.toString());

		return new EditingState(this.focusRequest, errors);
	}

	/**
	 * Find the error shown under a property row, whichever of its cells it belongs to.
	 * @param resourceId The resource of the row.
	 * @param propertyIndex The row.
	 * @returns The error, or `undefined` when the row has no error.
	 */
	errorForRow(resourceId: ResourceId, propertyIndex: number): CellError | undefined {
		for (const error of this.errors.values()) {
			if (error.cellKey.isInRow(resourceId, propertyIndex)) {
				return error;
			}
		}

		return undefined;
	}

	/**
	 * Find the error shown for a row that belongs to no property, such as a draft row.
	 * @param cellKey The row.
	 * @returns The error, or `undefined` when the row has no error.
	 */
	errorForCell(cellKey: CellKey): CellError | undefined {
		return this.errors.get(cellKey.toString());
	}
}
