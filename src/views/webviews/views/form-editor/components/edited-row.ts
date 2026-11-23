import { StatementServices } from '../hooks/use-statement-services';
import { StatementRowEditor } from '../state/statement-row-editor';
import { DefaultValueType } from '../state/new-value-type';
import { StatementRowState } from '../state/statement-row-state';

/**
 * What the parts of an edited row work with: its editor, its state as rendered, the means to read
 * what is typed and name the terms, and the field of a new value to move the focus to.
 */
export interface EditedRow {
	/**
	 * Edits the row.
	 */
	editor: StatementRowEditor;

	/**
	 * The state of the row as rendered.
	 */
	state: StatementRowState;

	/**
	 * Reads what is typed and names the terms.
	 */
	services: StatementServices;

	/**
	 * The type a new value of the row starts as, and the datatype a range gives it.
	 */
	defaultType: DefaultValueType;

	/**
	 * Move the focus to the field of a new value of the row, where the row has one.
	 */
	focusNewValue: () => void;

	/**
	 * Move the focus into the text of a literal of the row once it is shown, as into a literal just
	 * started.
	 * @param index The index of the literal among the values.
	 * @param caret Where the caret goes in the text; at its end where absent.
	 */
	focusValue: (index: number, caret?: number) => void;
}
