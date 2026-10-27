import { EditOperation } from '@src/services/editing/edit-operation';
import { getTermRefResourceId } from '@src/services/editing/resource-id';
import { ResourceId, TermRef } from '../form-editor-model';
import { CellKey } from '../services/cell-key';

/**
 * An edit the user made that the document does not show yet, either because the host is still
 * applying it or because the re-rendered rows for the new version have not arrived.
 */
export interface PendingEdit {
	/**
	 * The identifier the edit is reported back by.
	 */
	editId: string;

	/**
	 * The operations of the edit.
	 */
	operations: EditOperation[];

	/**
	 * The cell the edit was made from, where an error is shown if it fails.
	 */
	cellKey: CellKey;

	/**
	 * Whether the host is still applying the edit or has applied it.
	 */
	status: 'inFlight' | 'applied';

	/**
	 * The document version the edit produced, once applied.
	 */
	appliedVersion?: number;
}

/**
 * The transitions of the pending edits.
 */
export type PendingEditsAction =
	| { type: 'submit'; edit: PendingEdit }
	| { type: 'applied'; editId: string; version: number }
	| { type: 'rejected'; editId: string }
	| { type: 'settle'; version: number; resourceIds: ResourceId[] };

/**
 * Track the edits between submission and the arrival of the rows that show them.
 * @param state The pending edits.
 * @param action The transition.
 * @returns The next pending edits.
 */
export function pendingEditsReducer(state: PendingEdit[], action: PendingEditsAction): PendingEdit[] {
	switch (action.type) {
		case 'submit':
			return [...state, action.edit];
		case 'applied':
			return state.map(edit => edit.editId === action.editId ? { ...edit, status: 'applied', appliedVersion: action.version } : edit);
		case 'rejected':
			return state.filter(edit => edit.editId !== action.editId);
		case 'settle': {
			const settled = new Set(action.resourceIds);

			return state.filter(edit => !(
				edit.status === 'applied'
				&& edit.appliedVersion !== undefined
				&& edit.appliedVersion <= action.version
				&& resourceIdsOf(edit.operations).every(id => settled.has(id))
			));
		}
		default:
			return state;
	}
}

/**
 * Get the pending edits that touch a resource.
 * @param edits The pending edits.
 * @param resourceId The resource.
 * @returns The edits.
 */
export function pendingEditsFor(edits: readonly PendingEdit[], resourceId: ResourceId): PendingEdit[] {
	return edits.filter(edit => resourceIdsOf(edit.operations).includes(resourceId));
}

/**
 * Get the resources the operations of an edit describe.
 * @param operations The operations.
 * @returns The resource identifiers, each once.
 */
export function resourceIdsOf(operations: readonly EditOperation[]): ResourceId[] {
	const ids = new Set<ResourceId>();

	for (const operation of operations) {
		const subject = _subjectOf(operation);
		const id = subject ? getTermRefResourceId(subject) : undefined;

		if (id !== undefined) {
			ids.add(id);
		}
	}

	return Array.from(ids);
}

/**
 * Get the subject an operation acts on, if it acts on one.
 * @param operation The operation.
 * @returns The subject, or `undefined` for an operation on the document as a whole.
 */
function _subjectOf(operation: EditOperation): TermRef | undefined {
	if ('subject' in operation) {
		return operation.subject;
	}

	if ('parent' in operation) {
		return operation.parent;
	}

	return undefined;
}
