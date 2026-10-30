import { EditOperation } from '@src/services/editing/edit-operation';
import { EditOutcome } from '../services/editing-host-service.interface';

/**
 * Something the user edits that writes itself to the document, such as a statement row. The
 * {@link IEditingController} asks it for its operations only when they can be sent, so they are
 * always built from the version they are sent against.
 */
export interface EditWriter {
	/**
	 * The document version the data of the writer belongs to.
	 */
	readonly version: number;

	/**
	 * Whether the writer can build its operations now: its data is current and no edit of it is
	 * on its way or waiting for the data it produced.
	 */
	readonly ready: boolean;

	/**
	 * Whether the writer has something to write.
	 */
	readonly wantsToWrite: boolean;

	/**
	 * Build the operations of the next write. The writer counts the write as on its way once it
	 * returns operations.
	 * @returns The operations, or `undefined` when there turned out to be nothing to write.
	 */
	takeEdit(): EditOperation[] | undefined;

	/**
	 * Take in how the write ended.
	 * @param outcome The outcome.
	 */
	settle(outcome: EditOutcome): void;
}
