import { EditOperation } from '@src/services/editing/edit-operation';

/**
 * What a committed line asks the card to do.
 */
export type LineCommitPlan =
	/**
	 * Nothing changed.
	 */
	| { kind: 'none' }
	/**
	 * The row keeps showing this text without touching the document.
	 */
	| { kind: 'keep'; text: string }
	/**
	 * The row keeps showing this text and shows why it is not a statement.
	 */
	| { kind: 'problem'; text: string; message: string }
	/**
	 * A draft line goes away.
	 */
	| { kind: 'discard' }
	/**
	 * The operations to submit; the row shows the text until the host delivers it. A new nested
	 * node typed as `[]` is added under the line afterwards, for the predicate named.
	 */
	| { kind: 'edit'; operations: EditOperation[]; text: string; predicate: string; newNestedNode: boolean };
