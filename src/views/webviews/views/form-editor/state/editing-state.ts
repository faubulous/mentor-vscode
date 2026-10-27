import { EditRejectionReason } from '@src/services/editing/edit-operation';
import { ResourceId } from '../form-editor-model';
import { CellKey } from './cell-key';

/**
 * Why an edit of a cell failed, kept until the user dismisses it.
 */
export interface CellError {
	/**
	 * The cell the error is shown for.
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
 * The cell being edited and how the editor was opened.
 */
export interface EditingCell {
	/**
	 * The cell.
	 */
	cellKey: CellKey;

	/**
	 * Whether the editor starts with the current text or with the typed seed.
	 */
	mode: 'append' | 'replace';

	/**
	 * The text typed to open the editor, in replace mode.
	 */
	seed?: string;
}

/**
 * The transient state of editing: one open editor, one focus to restore, and the errors shown
 * under rows. Immutable: every transition returns the next state, or the state itself when
 * nothing changes, so React can tell the two apart.
 */
export class EditingState {
	/**
	 * The state before anything is edited.
	 */
	static readonly INITIAL = new EditingState();

	/**
	 * Create a state.
	 * @param editing The cell being edited, if any.
	 * @param focusRequest The cell to focus once it exists, after an edit re-rendered the rows.
	 * @param errors The errors shown, by the text form of their cell key.
	 */
	constructor(
		readonly editing?: EditingCell,
		readonly focusRequest?: CellKey,
		readonly errors: ReadonlyMap<string, CellError> = new Map()
	) { }

	/**
	 * Indicate whether a cell is being edited.
	 * @param cellKey The cell.
	 * @returns `true` when the cell's editor is open.
	 */
	isEditing(cellKey: CellKey): boolean {
		return cellKey.equals(this.editing?.cellKey);
	}

	/**
	 * Open the editor of a cell, closing any other.
	 * @param cell The cell and how its editor opens.
	 * @returns The next state.
	 */
	startEditing(cell: EditingCell): EditingState {
		return new EditingState(cell, this.focusRequest, this.errors);
	}

	/**
	 * Close the open editor. A two step flow opens the next editor before the previous one reports
	 * it is done, so closing is scoped to the cell that asks for it.
	 * @param cellKey When given, the editor only closes if this cell is the one being edited.
	 * @returns The next state, the state itself when no editor closes.
	 */
	stopEditing(cellKey?: CellKey): EditingState {
		if (!this.editing || (cellKey !== undefined && !this.isEditing(cellKey))) {
			return this;
		}

		return new EditingState(undefined, this.focusRequest, this.errors);
	}

	/**
	 * Ask for the focus to move to a cell once it exists.
	 * @param cellKey The cell.
	 * @returns The next state.
	 */
	requestFocus(cellKey: CellKey): EditingState {
		return new EditingState(this.editing, cellKey, this.errors);
	}

	/**
	 * Note that the requested focus was given.
	 * @returns The next state, the state itself when no focus was requested.
	 */
	focusFulfilled(): EditingState {
		return this.focusRequest ? new EditingState(this.editing, undefined, this.errors) : this;
	}

	/**
	 * Show an error for a cell.
	 * @param cellKey The cell.
	 * @param message The explanation shown to the user.
	 * @param reason Why the edit was not applied, when the host said.
	 * @returns The next state.
	 */
	withError(cellKey: CellKey, message: string, reason?: EditRejectionReason): EditingState {
		const errors = new Map(this.errors);

		errors.set(cellKey.toString(), { cellKey, message, reason });

		return new EditingState(this.editing, this.focusRequest, errors);
	}

	/**
	 * Remove the error shown for a cell.
	 * @param cellKey The cell.
	 * @returns The next state, the state itself when the cell had no error.
	 */
	withoutError(cellKey: CellKey): EditingState {
		if (!this.errors.has(cellKey.toString())) {
			return this;
		}

		const errors = new Map(this.errors);

		errors.delete(cellKey.toString());

		return new EditingState(this.editing, this.focusRequest, errors);
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
	 * Find the error shown for a cell outside the property rows, such as the subject cell.
	 * @param cellKey The cell.
	 * @returns The error, or `undefined` when the cell has no error.
	 */
	errorForCell(cellKey: CellKey): CellError | undefined {
		return this.errors.get(cellKey.toString());
	}
}
