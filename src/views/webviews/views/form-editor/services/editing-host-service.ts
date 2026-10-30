import { EditOperation } from '@src/services/editing/edit-operation';
import { FormEditorHostMessage, FormEditorWebviewMessage } from '../form-editor-messages';
import { EditOutcome, IEditingHostService, SubmittedEdit } from './editing-host-service.interface';

/**
 * An edit waiting for the host.
 */
interface QueuedEdit {
	/**
	 * The identifier the edit is reported back by.
	 */
	editId: string;

	/**
	 * The operations of the edit.
	 */
	operations: EditOperation[];

	/**
	 * The document version the operations were built from.
	 */
	baseVersion: number;

	/**
	 * Settles the outcome of the edit.
	 */
	resolve: (outcome: EditOutcome) => void;
}

/**
 * Implements the {@link IEditingHostService} over the webview message channel. Edits are sent one
 * at a time, each with the version it was built from: an edit refers to written values by their
 * offsets in that version, so the host must not apply it to another one.
 */
export class EditingHostService implements IEditingHostService {
	private readonly _queue: QueuedEdit[] = [];

	private _inFlight?: QueuedEdit;

	private _nextEditId = 1;

	/**
	 * Create the service over the message channel.
	 * @param _post Posts a message to the extension host.
	 */
	constructor(private readonly _post: (message: FormEditorWebviewMessage) => void) { }

	applyEdit(operations: EditOperation[], baseVersion: number): SubmittedEdit {
		const editId = `edit-${this._nextEditId++}`;
		const outcome = new Promise<EditOutcome>(resolve => {
			this._queue.push({ editId, operations, baseVersion, resolve });
			this._sendNext();
		});

		return { editId, outcome };
	}

	/**
	 * Take in a message from the host.
	 * @param message The message.
	 * @returns `true` if the message was one this service handles.
	 */
	accept(message: FormEditorHostMessage): boolean {
		switch (message.id) {
			case 'EditApplied':
				this._settle(message.editId, { ok: true, version: message.version, focus: message.focus, renamedIds: message.renamedIds ?? [] });
				return true;
			case 'EditRejected':
				this._settle(message.editId, { ok: false, reason: message.reason, message: message.message, version: message.version });
				return true;
			default:
				return false;
		}
	}

	/**
	 * Resolve the edit in flight and send the next one.
	 * @param editId The edit the host answered.
	 * @param outcome How it ended.
	 */
	private _settle(editId: string, outcome: EditOutcome): void {
		if (this._inFlight?.editId !== editId) {
			return;
		}

		const edit = this._inFlight;

		this._inFlight = undefined;
		edit.resolve(outcome);
		this._sendNext();
	}

	/**
	 * Send the next queued edit unless one is in flight.
	 */
	private _sendNext(): void {
		if (this._inFlight || this._queue.length === 0) {
			return;
		}

		const edit = this._queue.shift()!;

		this._inFlight = edit;
		this._post({ id: 'ApplyEdit', editId: edit.editId, baseVersion: edit.baseVersion, operations: edit.operations });
	}
}
