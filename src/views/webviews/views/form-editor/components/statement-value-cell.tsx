import { RowValue } from '../state/row-value';
import { EditableValue } from './editable-value';
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
	 * The index of the value among the values of its statement.
	 */
	index: number;

	/**
	 * The row the value belongs to, where it is edited.
	 */
	edited?: EditedRow;
}

/**
 * One value of a statement on a line of its own, with the comment lines written above it: as a
 * field where its row is edited, otherwise as it is read.
 * @param props The value, its row and where the row stands.
 * @returns The value.
 */
export function StatementValueCell({ value, index, edited, ...context }: StatementValueCellProps): React.JSX.Element {
	const view = value.kind === 'written' ? value.view : edited?.services.resolver.viewOf(value.term) ?? { term: value.term, editable: false };
	const comments = value.kind === 'written' ? value.view.comments : undefined;

	return (
		<span className={`statement-value${value.kind === 'written' && value.view.nested ? ' is-node' : ''}`}>
			{comments && <span className="statement-value-comment">{comments.join('\n')}</span>}
			{edited ? <EditableValue view={view} index={index} edited={edited} {...context} /> : <TermValue view={view} {...context} />}
		</span>
	);
}
