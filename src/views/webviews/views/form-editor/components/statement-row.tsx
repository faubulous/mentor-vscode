import { FormEvent, KeyboardEvent, useState } from 'react';
import { VscodeTextfield } from '@vscode-elements/elements';
import { PropertyView, TermRef, TermView } from '../form-editor-model';
import { StatementServices } from '../hooks/use-statement-services';
import { StatementRowHandle, useStatementRow } from '../hooks/use-statement-row';
import { IResourceDataService } from '../services/resource-data-service.interface';
import { LiteralDatatypes } from '../services/statement/literal-datatypes';
import { XSD_STRING } from '../services/statement/well-known-iris';
import { CellKey } from '../state/cell-key';
import { IEditingController } from '../state/editing-controller.interface';
import { RowValue } from '../state/row-value';
import { StatementDraft } from '../state/statement-draft';
import { LiteralField } from './literal-field';
import { RowError } from './row-error';
import { TermValue } from './term-value';
import { ValuePill } from './value-pill';

/**
 * Where a statement row stands: the card it belongs to and how deep it is nested.
 */
interface StatementRowContext {
	/**
	 * Supplies the statements of the blank nodes the values refer to.
	 */
	dataService: IResourceDataService;

	/**
	 * The nesting depth of the row: zero for a card of the list.
	 */
	depth: number;

	/**
	 * The resources that hold the row, which guard against cycles.
	 */
	visited: readonly string[];
}

/**
 * Properties of the {@link ReadOnlyStatementRow} component.
 */
export interface ReadOnlyStatementRowProps extends StatementRowContext {
	/**
	 * The property the row shows.
	 */
	property: PropertyView;
}

/**
 * A statement as it is read: the predicate by its label, then each value on a line of its own,
 * with the comment lines written above it.
 * @param props The property and where the row stands.
 * @returns The row.
 */
export function ReadOnlyStatementRow({ property, ...context }: ReadOnlyStatementRowProps): React.JSX.Element {
	const label = _labelOf(property.predicate);

	return (
		<div className="statement-line" role="group" aria-label={label}>
			<span className="statement-predicate" title={_iriOf(property.predicate.term)}>{label}</span>
			<span className="statement-values">
				{property.values.map((value, index) => (
					<span key={index} className={`statement-value${value.nested ? ' is-node' : ''}`}>
						{value.comments && <span className="statement-value-comment">{value.comments.join('\n')}</span>}
						<TermValue view={value} {...context} />
					</span>
				))}
			</span>
		</div>
	);
}

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
	const predicateLabel = predicateView ? _labelOf(predicateView) : state.predicateText;
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
 * Properties of the {@link EditableValue} component.
 */
interface EditableValueProps {
	/**
	 * The value.
	 */
	value: RowValue;

	/**
	 * The index of the value among the values of its statement.
	 */
	index: number;

	/**
	 * The row.
	 */
	row: StatementRowHandle;

	/**
	 * Gives typed terms their labels.
	 */
	services: StatementServices;

	/**
	 * Where the row stands.
	 */
	context: StatementRowContext;
}

/**
 * One value of an edited statement: a literal as its field, a resource as a pill with a button that
 * removes it, and a blank node or a list as it is read, with that button beside it.
 * @param props The value and its row.
 * @returns The value.
 */
function EditableValue({ value, index, row, services, context }: EditableValueProps): React.JSX.Element {
	const view = value.kind === 'written' ? value.view : services.resolver.viewOf(value.term);
	const remove = (): void => row.onRemoveValue(index);

	if (view.term.kind === 'literal' && !view.collection) {
		const term = view.term;

		return (
			<LiteralField
				index={index}
				text={term.value}
				tag={term.language ?? _datatypeLabel(term.datatype, services)}
				problem={row.literalProblems.get(index)}
				numeric={term.datatype !== undefined && LiteralDatatypes.isNumeric(term.datatype)}
				onInput={text => row.onLiteralInput(index, text)}
			/>
		);
	}

	if (view.term.kind === 'iri') {
		return <span data-value-index={index}><ValuePill view={view} onRemove={remove} /></span>;
	}

	return (
		<span className="statement-value-whole" data-value-index={index}>
			<TermValue view={view} {...context} />
			<button type="button" className="statement-value-remove" aria-label={`Remove value ${index + 1}`} title="Remove" onClick={remove}>
				<vscode-icon name="close" size={12}></vscode-icon>
			</button>
		</span>
	);
}

/**
 * Properties of the {@link NewValueField} component.
 */
interface NewValueFieldProps {
	/**
	 * The row.
	 */
	row: StatementRowHandle;

	/**
	 * Whether the statement has no values yet.
	 */
	empty: boolean;
}

/**
 * The field a new value is typed into: Enter adds the value it reads as, and Backspace in the
 * empty field removes the last value.
 * @param props The row.
 * @returns The field.
 */
function NewValueField({ row, empty }: NewValueFieldProps): React.JSX.Element {
	const handleKeyDown = (event: KeyboardEvent<VscodeTextfield>): void => {
		if (event.key === 'Enter') {
			event.preventDefault();
			event.stopPropagation();
			row.onPendingCommit();
		} else if (event.key === 'Backspace' && row.state.pendingText === '' && row.state.draft.values.length > 0) {
			event.preventDefault();
			row.onRemoveValue(row.state.draft.values.length - 1);
		}
	};

	return (
		<vscode-textfield
			className="input-field is-new"
			value={row.state.pendingText}
			placeholder={empty ? 'value' : 'add a value'}
			aria-label="New value"
			autocomplete="off"
			onInput={(event: FormEvent<VscodeTextfield>) => row.onPendingInput(event.currentTarget.value)}
			onKeyDown={handleKeyDown}
		/>
	);
}

/**
 * The label a term is shown by: its label, else its prefixed name, else its IRI.
 * @param view The view of the term.
 * @returns The label.
 */
function _labelOf(view: TermView): string {
	return view.label || view.prefixedName || _iriOf(view.term) || '';
}

/**
 * The IRI of a term, if it is one.
 * @param term The term.
 * @returns The IRI.
 */
function _iriOf(term: TermRef): string | undefined {
	return term.kind === 'iri' ? term.iri : undefined;
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
 * The label of a datatype: the name the fields know it by, else its prefixed name.
 * @param datatype The IRI of the datatype.
 * @param services Gives the datatype its prefixed name.
 * @returns The label, or `undefined` for plain text.
 */
function _datatypeLabel(datatype: string | undefined, services: StatementServices): string | undefined {
	if (!datatype || datatype === XSD_STRING) {
		return undefined;
	}

	return LiteralDatatypes.of(datatype)?.label ?? services.resolver.viewOf({ kind: 'iri', iri: datatype }).prefixedName ?? datatype;
}

/**
 * Indicate whether a value is a blank node shown as a card.
 * @param value The value.
 * @returns `true` for a blank node with a form.
 */
function _isNode(value: RowValue): boolean {
	return value.kind === 'written' && value.view.nested !== undefined;
}
