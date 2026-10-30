import { TermView } from '../form-editor-model';
import { RowValue } from '../state/row-value';
import { EditableLiteral } from './editable-literal';
import { EditedRow } from './edited-row';
import { StatementRowContext } from './statement-row-context';
import { TermValue } from './term-value';

/**
 * Properties of the {@link StatementValueCell} component.
 */
export interface StatementValueCellProps extends StatementRowContext {
	/**
	 * The value.
	 */
	value: RowValue;

	/**
	 * The view the value is shown with.
	 */
	view: TermView;

	/**
	 * The index of the value among the values of its statement.
	 */
	index: number;

	/**
	 * The row the value belongs to, where it is edited.
	 */
	edited?: EditedRow;
}

/**
 * A literal, a blank node or a list of a statement on a line of its own, with the comment lines
 * written above it. Where its row is edited, a literal is its field, and a blank node or a list
 * has a button that removes it; otherwise the value is shown as it is read.
 * @param props The value, its row and where the row stands.
 * @returns The value.
 */
export function StatementValueCell({ value, view, index, edited, ...context }: StatementValueCellProps): React.JSX.Element {
	const comments = value.kind === 'written' ? value.view.comments : undefined;

	return (
		<span className={`statement-value${value.kind === 'written' && value.view.nested ? ' is-node' : ''}`}>
			{comments && <span className="statement-value-comment">{comments.join('\n')}</span>}
			{edited ? _editedValue(view, index, edited, context) : <TermValue view={view} {...context} />}
		</span>
	);
}

/**
 * A value of an edited row: a literal as its field, anything else as it is read with a button that
 * removes it.
 * @param view The view of the value.
 * @param index The index of the value.
 * @param edited The row.
 * @param context Where the row stands.
 * @returns The value.
 */
function _editedValue(view: TermView, index: number, edited: EditedRow, context: StatementRowContext): React.JSX.Element {
	if (view.term.kind === 'literal' && !view.collection) {
		return <EditableLiteral view={view} index={index} edited={edited} />;
	}

	return (
		<span className="statement-value-whole" data-value-index={index}>
			<TermValue view={view} {...context} />
			<button type="button" className="statement-value-remove" aria-label={`Remove value ${index + 1}`} title="Remove" onClick={() => edited.editor.removeValue(index)}>
				<vscode-icon name="close" size={12}></vscode-icon>
			</button>
		</span>
	);
}
