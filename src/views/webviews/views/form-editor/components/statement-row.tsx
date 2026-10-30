import { FocusEvent, KeyboardEvent } from 'react';
import { PropertyView, TermView } from '../form-editor-model';
import { useRowEditorState } from '../hooks/use-row-editor-state';
import { StatementServices } from '../hooks/use-statement-services';
import { RowValue } from '../state/row-value';
import { StatementRowEditor } from '../state/statement-row-editor';
import { StatementRowState } from '../state/statement-row-state';
import { NewValueField } from './new-value-field';
import { PredicateField } from './predicate-field';
import { getRowErrorMessage } from './row-error-message';
import { RowError } from './row-error';
import { StatementRowContext } from './statement-row-context';
import { StatementValueCell } from './statement-value-cell';
import { getTermLabel, getTermTitle } from './term-labels';

/**
 * Properties of the {@link StatementRow} component.
 */
export interface StatementRowProps extends StatementRowContext {
	/**
	 * The property the row shows, or none for a row a new statement is typed into.
	 */
	property?: PropertyView;

	/**
	 * Edits the row; absent for a row that only reads.
	 */
	editor?: StatementRowEditor;

	/**
	 * Reads what is typed and names the terms; present wherever the row is edited.
	 */
	services?: StatementServices;
}

/**
 * A statement of a card: the predicate, then each value on a line of its own with the comment
 * lines written above it. A row that only reads shows the predicate by its label and the values
 * as they are read. An edited row shows the same values as fields: the predicate field, a field
 * per literal, a pill per resource and the card of a blank node or the items of a list, each
 * removable, and the field a new value is typed into. It is written when the focus leaves it or
 * Enter is pressed in a literal; Escape gives up what was typed.
 * @param props The statement, its editor and where the row stands.
 * @returns The row.
 */
export function StatementRow({ property, editor, services, ...context }: StatementRowProps): React.JSX.Element {
	const state = useRowEditorState(editor);
	const edited = editor && state && services ? { editor, state, services } : undefined;
	const values: readonly RowValue[] = state?.draft.values ?? property?.values.map(view => ({ kind: 'written' as const, view })) ?? [];
	const predicateView = edited ? _editedPredicateView(edited.state, edited.services) : property?.predicate;
	const label = predicateView ? getTermLabel(predicateView) : state?.predicateText ?? '';
	const error = state ? getRowErrorMessage(state) : undefined;

	const handleKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
		if (event.key === 'Escape') {
			event.preventDefault();
			editor?.revert();
		} else if (event.key === 'Enter' && !event.shiftKey) {
			editor?.confirm();
		}
	};

	const handleBlur = (event: FocusEvent<HTMLElement>): void => {
		const next = event.relatedTarget;

		if (!(next instanceof Node) || !event.currentTarget.contains(next)) {
			editor?.leave();
		}
	};

	return (
		<div
			className={`statement-line${edited ? ' is-editable' : ''}${editor?.isNew ? ' is-draft' : ''}`}
			role="group"
			aria-label={editor?.isNew ? 'New statement' : label}
			tabIndex={edited ? -1 : undefined}
			onKeyDown={edited ? handleKeyDown : undefined}
			onBlur={edited ? handleBlur : undefined}
		>
			<span className="statement-predicate" title={edited ? undefined : predicateView && getTermTitle(predicateView.term)}>
				{edited ? <PredicateField editor={edited.editor} state={edited.state} label={label} /> : label}
			</span>
			<span className="statement-values">
				{values.map((value, index) => (
					<StatementValueCell key={index} value={value} index={index} edited={edited} {...context} />
				))}
				{edited && <NewValueField editor={edited.editor} state={edited.state} />}
			</span>
			{error && <RowError message={error} onDismiss={state?.rejection ? () => editor?.dismissRejection() : undefined} />}
		</div>
	);
}

/**
 * The view of the predicate an edited row names, once it names one.
 * @param state The state of the row.
 * @param services Gives the predicate its label.
 * @returns The view, or `undefined` while the row names no predicate.
 */
function _editedPredicateView(state: StatementRowState, services: StatementServices): TermView | undefined {
	return state.draft.predicate ? services.resolver.viewOf({ kind: 'iri', iri: state.draft.predicate }) : undefined;
}
