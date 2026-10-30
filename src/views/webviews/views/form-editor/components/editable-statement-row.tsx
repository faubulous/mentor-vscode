import { FormEvent, KeyboardEvent, useState } from 'react';
import { VscodeTextfield } from '@vscode-elements/elements';
import { PropertyView, TermRef } from '../form-editor-model';
import { StatementServices } from '../hooks/use-statement-services';
import { useStatementRow } from '../hooks/use-statement-row';
import { CellKey } from '../state/cell-key';
import { IEditingController } from '../state/editing-controller.interface';
import { RowValue } from '../state/row-value';
import { StatementDraft } from '../state/statement-draft';
import { EditableValue } from './editable-value';
import { NewValueField } from './new-value-field';
import { RowError } from './row-error';
import { StatementRowContext } from './statement-row-context';
import { getTermLabel } from './term-labels';

/**
 * Properties of the {@link EditableStatementRow} component.
 */
export interface EditableStatementRowProps extends StatementRowContext {
	/**
	 * The row, which carries its key for the focus to come back to.
	 */
	cellKey: CellKey;

	/**
	 * The resource the statement is about.
	 */
	subject: TermRef;

	/**
	 * The property the row shows, or none for a row a new statement is typed into.
	 */
	property?: PropertyView;

	/**
	 * Whether the property belongs to an earlier document version while the current one loads.
	 */
	stale: boolean;

	/**
	 * Reads what is typed and gives the terms their labels.
	 */
	services: StatementServices;

	/**
	 * Hands the edits to the host.
	 */
	editing: IEditingController;

	/**
	 * Called with the statement typed into a row for a new statement once it was handed to the host.
	 */
	onSubmitted?: (statement: StatementDraft) => void;
}

/**
 * A statement as fields: the predicate, a pill per resource with a button that removes it, a field
 * per literal with its language tag or datatype after the text, the card of a blank node and the
 * items of a list as they are read, and the field a new value is typed into. The row is written
 * when the focus leaves it or Enter is pressed in a literal; Escape gives up what was typed.
 * @param props The statement and where its edits go.
 * @returns The row.
 */
export function EditableStatementRow(props: EditableStatementRowProps): React.JSX.Element {
	const { cellKey, subject, property, stale, services, editing, onSubmitted, ...context } = props;
	const predicateText = property ? _predicateText(property, services) : '';
	const row = useStatementRow({ cellKey, subject, property, predicateText, version: context.dataService.version, stale, reader: services.reader, editing, onSubmitted });
	const { state } = row;
	const [predicateFocused, setPredicateFocused] = useState(false);
	const predicateView = state.draft.predicate ? services.resolver.viewOf({ kind: 'iri', iri: state.draft.predicate }) : undefined;
	const predicateLabel = predicateView ? getTermLabel(predicateView) : state.predicateText;
	const error = (property ? editing.state.errorForRow(cellKey.resourceId, cellKey.propertyIndex ?? -1) : editing.state.errorForCell(cellKey))?.message ?? state.problem;

	const handlePredicateKeyDown = (event: KeyboardEvent<VscodeTextfield>): void => {
		if (event.key === 'Enter') {
			event.preventDefault();
			event.stopPropagation();
			row.onPredicateCommit();
		}
	};

	return (
		<div
			className={`statement-line is-editable${property ? '' : ' is-draft'}`}
			role="group"
			aria-label={property ? predicateLabel : 'New statement'}
			data-cell={cellKey.toString()}
			tabIndex={-1}
			onKeyDown={row.onKeyDown}
			onBlur={row.onBlur}
		>
			<span className="statement-predicate">
				<vscode-textfield
					className="input-field is-predicate"
					value={predicateFocused || !property ? state.predicateText : predicateLabel}
					placeholder="predicate"
					title={state.predicateText}
					aria-label="Predicate"
					autocomplete="off"
					onFocus={() => setPredicateFocused(true)}
					onBlur={() => {
						setPredicateFocused(false);

						if (state.predicateText.trim() !== '') {
							row.onPredicateCommit();
						}
					}}
					onInput={(event: FormEvent<VscodeTextfield>) => row.onPredicateInput(event.currentTarget.value)}
					onKeyDown={handlePredicateKeyDown}
				/>
			</span>
			<span className="statement-values">
				{state.draft.values.map((value, index) => (
					<span key={index} className={`statement-value${_isNode(value) ? ' is-node' : ''}`}>
						{value.kind === 'written' && value.view.comments && <span className="statement-value-comment">{value.view.comments.join('\n')}</span>}
						<EditableValue value={value} index={index} row={row} services={services} context={context} />
					</span>
				))}
				<NewValueField row={row} empty={state.draft.values.length === 0} />
			</span>
			{error && <RowError message={error} onDismiss={() => editing.dismissError(cellKey)} />}
		</div>
	);
}

/**
 * How the predicate of a property is written in its field: its prefixed name, else its IRI.
 * @param property The property.
 * @param services Gives the predicate its prefixed name.
 * @returns The text.
 */
function _predicateText(property: PropertyView, services: StatementServices): string {
	const term = property.predicate.term;

	return property.predicate.prefixedName ?? services.resolver.viewOf(term).prefixedName ?? (term.kind === 'iri' ? `<${term.iri}>` : '');
}

/**
 * Indicate whether a value is a blank node shown as a card.
 * @param value The value.
 * @returns `true` for a blank node with a form.
 */
function _isNode(value: RowValue): boolean {
	return value.kind === 'written' && value.view.nested !== undefined;
}
