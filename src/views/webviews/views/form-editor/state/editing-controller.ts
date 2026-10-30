import { EditOperation } from '@src/services/editing/edit-operation';
import { ResourceId } from '../form-editor-model';
import { EditOutcome, IEditingHostService } from '../services/editing-host-service.interface';
import { CellKey } from './cell-key';
import { IEditingController } from './editing-controller.interface';
import { EditingState } from './editing-state';
import { PendingEdit, PendingEdits } from './pending-edits';

/**
 * Implements the {@link IEditingController} over an editing host service: hands the edits over,
 * keeps them pending until the rows show them, and turns their outcomes into the editing state
 * the rows render. Subscribers are told of every change.
 */
export class EditingController implements IEditingController {
	private readonly _listeners = new Set<() => void>();

	private _state = EditingState.INITIAL;

	private _pendingEdits = PendingEdits.NONE;

	private _revision = 0;

	/**
	 * Create the controller.
	 * @param _hostService The host the edits are handed to.
	 */
	constructor(private readonly _hostService: IEditingHostService) { }

	get state(): EditingState {
		return this._state;
	}

	/**
	 * How many changes the controller went through, which tells a subscriber whether it saw the
	 * latest.
	 */
	get revision(): number {
		return this._revision;
	}

	/**
	 * Subscribe to changes of the state or the pending edits.
	 * @param listener Invoked on every change.
	 * @returns A function that removes the subscription.
	 */
	subscribe(listener: () => void): () => void {
		this._listeners.add(listener);

		return () => this._listeners.delete(listener);
	}

	submit(operations: EditOperation[], cellKey: CellKey, baseVersion: number, predictedFocus?: CellKey): Promise<EditOutcome> {
		const edit = this._hostService.applyEdit(operations, baseVersion);

		this._pendingEdits = this._pendingEdits.submit({ editId: edit.editId, operations, cellKey, status: 'inFlight' });
		this._setState(this._state.withoutError(cellKey));

		return edit.outcome.then(outcome => {
			this._settle(edit.editId, cellKey, predictedFocus, outcome);

			return outcome;
		});
	}

	requestFocus(cellKey: CellKey): void {
		this._setState(this._state.requestFocus(cellKey));
	}

	/**
	 * Note that the requested focus was given.
	 */
	focusFulfilled(): void {
		this._setState(this._state.focusFulfilled());
	}

	dismissError(cellKey: CellKey): void {
		this._setState(this._state.withoutError(cellKey));
	}

	/**
	 * Drop the applied edits whose resources arrived re-rendered for the version they produced.
	 * @param version The document version the rows belong to.
	 * @param resourceIds The resources whose rows arrived.
	 */
	settleDelivered(version: number, resourceIds: readonly ResourceId[]): void {
		const settled = this._pendingEdits.settle(version, resourceIds);

		if (settled.edits.length !== this._pendingEdits.edits.length) {
			this._pendingEdits = settled;
			this._notify();
		}
	}

	pendingEditsFor(resourceId: ResourceId): PendingEdit[] {
		return this._pendingEdits.editsFor(resourceId);
	}

	/**
	 * Take in the outcome of an edit: an applied edit asks for the focus the host names, or the
	 * one predicted; a rejected one shows its reason at the cell it was made from.
	 * @param editId The edit.
	 * @param cellKey The cell the edit was made from.
	 * @param predictedFocus The cell to focus unless the host names one.
	 * @param outcome How the edit ended.
	 */
	private _settle(editId: string, cellKey: CellKey, predictedFocus: CellKey | undefined, outcome: EditOutcome): void {
		if (outcome.ok) {
			const focus = outcome.focus ? CellKey.fromFocusHint(outcome.focus) : predictedFocus;

			this._pendingEdits = this._pendingEdits.applied(editId, outcome.version);
			this._setState(focus ? this._state.requestFocus(focus) : this._state);
		} else {
			this._pendingEdits = this._pendingEdits.rejected(editId);
			this._setState(this._state.withError(cellKey, outcome.message, outcome.reason).requestFocus(cellKey));
		}
	}

	/**
	 * Replace the state and tell the subscribers.
	 * @param state The next state.
	 */
	private _setState(state: EditingState): void {
		this._state = state;
		this._notify();
	}

	/**
	 * Tell the subscribers of a change.
	 */
	private _notify(): void {
		this._revision++;

		for (const listener of this._listeners) {
			listener();
		}
	}
}
