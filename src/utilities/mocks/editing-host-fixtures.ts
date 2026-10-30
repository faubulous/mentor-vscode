import { EditOperation } from '@src/services/editing/edit-operation';
import { EditOutcome, IEditingHostService } from '@src/views/webviews/views/form-editor/services/editing-host-service.interface';

/**
 * An edit handed to the host stub.
 */
interface AppliedEditRecord {
	/**
	 * The operations of the edit.
	 */
	operations: EditOperation[];

	/**
	 * The document version the edit was built from.
	 */
	baseVersion: number;
}

/**
 * An editing host that records the edits it is handed and lets the test decide how each ends.
 */
export interface EditingHostStub extends IEditingHostService {
	/**
	 * The edits handed over so far, in order.
	 */
	submitted: AppliedEditRecord[];

	/**
	 * End the oldest edit that has not ended yet, and let what waits for it run.
	 * @param outcome How it ends; applied as the version after its base when omitted.
	 */
	settle(outcome?: EditOutcome): Promise<void>;
}

/**
 * Make an editing host that records what is handed to it.
 * @returns The host.
 */
export function createEditingHostStub(): EditingHostStub {
	const submitted: AppliedEditRecord[] = [];
	const pending: { baseVersion: number; resolve: (outcome: EditOutcome) => void }[] = [];

	return {
		submitted,
		applyEdit: (operations, baseVersion) => {
			submitted.push({ operations, baseVersion });

			return { editId: `edit-${submitted.length}`, outcome: new Promise<EditOutcome>(resolve => pending.push({ baseVersion, resolve })) };
		},
		settle: async outcome => {
			const edit = pending.shift();

			edit?.resolve(outcome ?? { ok: true, version: edit.baseVersion + 1 });
			await Promise.resolve();
			await Promise.resolve();
		}
	};
}
