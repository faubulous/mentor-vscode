import { StatementServices } from '../hooks/use-statement-services';
import { StatementRowEditor } from '../state/statement-row-editor';
import { StatementRowState } from '../state/statement-row-state';

/**
 * What the parts of an edited row work with: its editor, its state as rendered, and the means
 * to read what is typed and name the terms.
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
}
