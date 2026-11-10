import { TermView } from '../form-editor-model';
import { RowValue } from '../state/row-value';
import { useFormEditorContext } from '../state/form-editor-context';
import { DraftResourceCard } from './draft-resource-card';
import { LiteralValueField } from './literal-value-field';
import { NestedCardActions } from './nested-card-menu';
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
 * written above it, which the nested card of a blank node shows in its header. Where its row is
 * edited, a literal is its field, a blank node has the ⋯ menu of its nested card, and a list has a
 * button that removes it; otherwise the value is shown as it is read.
 * @param props The value, its row and where the row stands.
 * @returns The value.
 */
export function StatementValueCell({ value, view, index, edited, ...context }: StatementValueCellProps): React.JSX.Element {
	const { onCopyAsTurtle } = useFormEditorContext();
	const comments = value.kind === 'written' ? value.view.comments : undefined;
	const isNode = view.nested !== undefined || (value.kind === 'term' && value.node !== undefined);

	return (
		<span className={`statement-value${isNode ? ' is-node' : ''}`}>
			{comments && !view.nested && <span className="statement-comment statement-value-comment">{comments.join('\n')}</span>}
			{edited ? _editedValue(value, view, index, edited, context, onCopyAsTurtle) : <TermValue view={view} comments={comments} {...context} />}
		</span>
	);
}

/**
 * A value of an edited row: a literal as its field, a new blank node as the card that asks for its
 * type, a copy on its way as the value it copies, a blank node as its nested card with the ⋯ menu,
 * anything else as it is read with a button that removes it.
 * @param value The value.
 * @param view The view of the value.
 * @param index The index of the value.
 * @param edited The row.
 * @param context Where the row stands.
 * @param onCopyAsTurtle Puts the text of a blank node on the clipboard, where the host can.
 * @returns The value.
 */
function _editedValue(value: RowValue, view: TermView, index: number, edited: EditedRow, context: StatementRowContext, onCopyAsTurtle?: (anchor: number, version: number) => void): React.JSX.Element {
	if (value.kind === 'term' && value.node?.copyOf) {
		return <TermValue view={view} {...context} />;
	}

	if (value.kind === 'term' && value.node) {
		return <DraftResourceCard type={value.node.type} index={index} edited={edited} />;
	}

	if (view.term.termType === 'Literal' && !view.collection) {
		return <LiteralValueField view={view} index={index} edited={edited} />;
	}

	if (view.nested) {
		return <TermValue view={view} comments={value.kind === 'written' ? value.view.comments : undefined} {...context} nestedActions={_nestedActionsOf(view, index, edited, onCopyAsTurtle)} />;
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

/**
 * What the ⋯ menu of the nested card of a blank node does in its row.
 * @param view The view of the node.
 * @param index The index of the node among the values of the row.
 * @param edited The row.
 * @param onCopyAsTurtle Puts the text of a blank node on the clipboard, where the host can.
 * @returns The actions.
 */
function _nestedActionsOf(view: TermView, index: number, edited: EditedRow, onCopyAsTurtle?: (anchor: number, version: number) => void): NestedCardActions {
	const anchor = view.anchor;

	return {
		onDuplicate: () => edited.editor.duplicateValue(index),
		onCopyAsTurtle: onCopyAsTurtle && anchor !== undefined ? () => onCopyAsTurtle(anchor, edited.editor.version) : undefined,
		onRemove: () => {
			edited.editor.removeValue(index);
			edited.editor.confirm();
		}
	};
}
