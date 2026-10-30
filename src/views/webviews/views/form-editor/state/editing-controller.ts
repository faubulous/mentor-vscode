import { EditOperation } from '@src/services/editing/edit-operation';
import { IEditingHostService } from '../services/editing-host-service.interface';
import { EditWriter } from './edit-writer';
import { IEditingController } from './editing-controller.interface';

/**
 * Implements the {@link IEditingController} over an editing host service. It is the one place
 * that orders the writes of the form: one edit is with the host at a time, and the next is built
 * only once its writer holds data of the version the last edit produced. An edit refers to written
 * values by their offsets in the version it was built from, so an edit built earlier would be
 * refused as stale. It also tells which resources have writes that are not done, so their cards
 * stay mounted and receive the data the writes wait for.
 */
export class EditingController implements IEditingController {
	private readonly _queue: EditWriter[] = [];

	private readonly _busy = new Set<EditWriter>();

	private readonly _listeners = new Set<() => void>();

	private _busyResourceIds: ReadonlySet<string> = new Set();

	private _sending?: EditWriter;

	private _latestVersion = Number.NEGATIVE_INFINITY;

	private _flushing = false;

	/**
	 * Create the controller.
	 * @param _hostService The host the edits are handed to.
	 */
	constructor(private readonly _hostService: IEditingHostService) { }

	/**
	 * The resources whose writes are not done yet, whose cards have to stay mounted until they are,
	 * so their rows receive the data the writes wait for.
	 */
	get busyResourceIds(): ReadonlySet<string> {
		return this._busyResourceIds;
	}

	/**
	 * Subscribe to changes of the {@link busyResourceIds}.
	 * @param listener Invoked on every change.
	 * @returns A function that removes the subscription.
	 */
	subscribe(listener: () => void): () => void {
		this._listeners.add(listener);

		return () => this._listeners.delete(listener);
	}

	requestWrite(writer: EditWriter): void {
		if (!this._queue.includes(writer)) {
			this._queue.push(writer);
		}

		this._busy.add(writer);
		this.flush();
	}

	flush(): void {
		// A writer may ask for another one to be written while it builds its edit.
		if (this._flushing) {
			return;
		}

		this._flushing = true;

		try {
			this._sendNext();
		} finally {
			this._flushing = false;
		}

		this._updateBusyResources();
	}

	/**
	 * Drop the writers that are done, and tell the subscribers when the resources with writes that
	 * are not done changed.
	 */
	private _updateBusyResources(): void {
		for (const writer of this._busy) {
			if (!writer.busy) {
				this._busy.delete(writer);
			}
		}

		const ids = new Set(Array.from(this._busy, writer => writer.resourceId));

		if (ids.size === this._busyResourceIds.size && Array.from(ids).every(id => this._busyResourceIds.has(id))) {
			return;
		}

		this._busyResourceIds = ids;

		for (const listener of this._listeners) {
			listener();
		}
	}

	/**
	 * Send the edit of the first writer that can build one, unless an edit is with the host.
	 * Writers with nothing left to write leave the queue.
	 */
	private _sendNext(): void {
		let index = 0;

		while (!this._sending && index < this._queue.length) {
			const writer = this._queue[index];

			if (!writer.wantsToWrite) {
				this._queue.splice(index, 1);
				continue;
			}

			if (!writer.ready || writer.version < this._latestVersion) {
				index++;
				continue;
			}

			const operations = writer.takeEdit();

			if (operations) {
				this._send(writer, operations);
			}
		}
	}

	/**
	 * Hand an edit to the host and send the next one once it ended.
	 * @param writer The writer the edit belongs to.
	 * @param operations The operations of the edit.
	 */
	private _send(writer: EditWriter, operations: EditOperation[]): void {
		this._sending = writer;

		void this._hostService.applyEdit(operations, writer.version).outcome.then(outcome => {
			this._latestVersion = Math.max(this._latestVersion, outcome.version);
			this._sending = undefined;
			writer.settle(outcome);
			this.flush();
		});
	}
}
