import { LineModel } from './line-model';

/**
 * One row of a card: the statement of a property, or the line a new statement is typed into.
 */
export interface CardLine {
	/**
	 * The cell key the row is focused and restored by.
	 */
	key: string;

	/**
	 * The index of the property the row belongs to, in the order of the resource detail; none
	 * for a draft.
	 */
	propertyIndex?: number;

	/**
	 * The canonical text of the row.
	 */
	text: string;

	/**
	 * The serialized property of a statement row.
	 */
	model?: LineModel;

	/**
	 * Whether the row can be edited.
	 */
	editable: boolean;
}
