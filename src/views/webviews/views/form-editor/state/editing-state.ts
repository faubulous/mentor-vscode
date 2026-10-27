import { EditRejectionReason } from '@src/services/editing/edit-operation';
import { CellKey } from '../services/cell-key';
import { LineCaret } from './line-caret';

/**
 * Why an edit of a cell failed, kept until the user dismisses it.
 */
export interface CellError {
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
 * An error together with the cell it is shown for.
 */
export type CellErrorAt = CellError & {
	/**
	 * The cell the error belongs to.
	 */
	cellKey: CellKey;
};

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
 * The cell to focus once it exists, and where to put the caret when the cell is a text line.
 */
export interface FocusRequest {
	/**
	 * The cell.
	 */
	cellKey: CellKey;

	/**
	 * Where the caret goes in a statement line.
	 */
	caret?: LineCaret;
}

/**
 * The transient state of editing: one open editor, one focus to restore, and the errors shown
 * under rows.
 */
export interface EditingState {
	/**
	 * The cell being edited, if any.
	 */
	editing?: EditingCell;

	/**
	 * The cell to focus once it exists, after an edit re-rendered the rows.
	 */
	focusRequest?: FocusRequest;

	/**
	 * The errors shown, by cell.
	 */
	errors: Record<CellKey, CellError>;
}

/**
 * The transitions of the editing state.
 */
export type EditingStateAction =
	| { type: 'startEditing'; cell: EditingCell }
	| { type: 'stopEditing'; cellKey?: CellKey }
	| { type: 'requestFocus'; cellKey: CellKey; caret?: LineCaret }
	| { type: 'focusFulfilled' }
	| { type: 'setError'; cellKey: CellKey; message: string; reason?: EditRejectionReason }
	| { type: 'clearError'; cellKey: CellKey };

/**
 * The state before anything is edited.
 */
export const INITIAL_EDITING_STATE: EditingState = { errors: {} };

/**
 * Apply a transition to the editing state.
 * @param state The current state.
 * @param action The transition.
 * @returns The next state, the same object when nothing changed.
 */
export function editingStateReducer(state: EditingState, action: EditingStateAction): EditingState {
	switch (action.type) {
		case 'startEditing':
			return { ...state, editing: action.cell };
		case 'stopEditing':
			// A two step flow opens the next editor before the previous one reports it is done, so
			// closing is scoped to the cell that asks for it.
			if (!state.editing || (action.cellKey !== undefined && state.editing.cellKey !== action.cellKey)) {
				return state;
			}

			return { ...state, editing: undefined };
		case 'requestFocus':
			return { ...state, focusRequest: { cellKey: action.cellKey, caret: action.caret } };
		case 'focusFulfilled':
			return state.focusRequest ? { ...state, focusRequest: undefined } : state;
		case 'setError':
			return { ...state, errors: { ...state.errors, [action.cellKey]: { message: action.message, reason: action.reason } } };
		case 'clearError':
			return _withoutError(state, action.cellKey);
		default:
			return state;
	}
}

/**
 * Find the error shown under a property row, whichever of its cells it belongs to.
 * @param errors The errors by cell key.
 * @param resourceId The resource of the row.
 * @param propertyIndex The row.
 * @returns The error with its cell key, or `undefined` when the row has no error.
 */
export function errorForRow(errors: Record<CellKey, CellError>, resourceId: string, propertyIndex: number): CellErrorAt | undefined {
	const prefixes = [`${resourceId}|value|${propertyIndex}|`, `${resourceId}|predicate|${propertyIndex}|`, `${resourceId}|line|${propertyIndex}|`];

	for (const [cellKey, error] of Object.entries(errors)) {
		if (prefixes.some(prefix => cellKey.startsWith(prefix))) {
			return { cellKey, ...error };
		}
	}

	return undefined;
}

/**
 * Find the error shown for a cell outside the property rows, such as the subject cell.
 * @param errors The errors by cell key.
 * @param cellKey The cell.
 * @returns The error with its cell key, or `undefined` when the cell has no error.
 */
export function errorForCell(errors: Record<CellKey, CellError>, cellKey: CellKey): CellErrorAt | undefined {
	const error = errors[cellKey];

	return error ? { cellKey, ...error } : undefined;
}

/**
 * Remove the error of a cell.
 * @param state The current state.
 * @param cellKey The cell.
 * @returns The next state, the same object when the cell had no error.
 */
function _withoutError(state: EditingState, cellKey: CellKey): EditingState {
	if (!(cellKey in state.errors)) {
		return state;
	}

	const errors = { ...state.errors };

	delete errors[cellKey];

	return { ...state, errors };
}
