import { useFormEditorContext } from '../state/form-editor-context';
import { EditableStatementList } from './editable-statement-list';
import { ReadOnlyStatementList } from './read-only-statement-list';
import { StatementListProps } from './statement-list-props';

/**
 * The statements of a card as rows, in document order, each preceded by the comment lines
 * written above it. Where the document can be written, the rows of a card of the list are edited
 * in place and a row for a new statement follows them; the rows of a nested blank node, and those
 * whose values cannot all be kept by their place, are read.
 * @param props The resource and where the list stands.
 * @returns The rows.
 */
export function StatementList(props: StatementListProps): React.JSX.Element {
	const { editing, readOnly } = useFormEditorContext();

	return !readOnly && editing && props.depth === 0
		? <EditableStatementList {...props} editing={editing} />
		: <ReadOnlyStatementList {...props} />;
}
