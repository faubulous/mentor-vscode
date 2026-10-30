import { FormEvent, KeyboardEvent, useState } from 'react';
import { VscodeTextfield } from '@vscode-elements/elements';
import { PropertyView, TermRef, TermView } from '../form-editor-model';
import { StatementServices } from '../hooks/use-statement-services';
import { StatementRowHandle, useStatementRow } from '../hooks/use-statement-row';
import { IResourceDataService } from '../services/resource-data-service.interface';
import { LiteralDatatypes } from '../services/statement/literal-datatypes';
import { XSD_INTEGER, XSD_STRING } from '../services/statement/well-known-iris';
import { CellKey } from '../state/cell-key';
import { IEditingController } from '../state/editing-controller.interface';
import { RowValue } from '../state/row-value';
import { StatementDraft } from '../state/statement-draft';
import { LiteralField } from './literal-field';
import { ResourceValues } from './resource-values';
import { RowError } from './row-error';
import { TermValue } from './term-value';

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
			<span className="statement-gutter"></span>
			<span className="statement-predicate" title={_iriOf(property.predicate.term)}>{label}</span>
			<span className="statement-values">
				{property.values.map((value, index) => (
					<span key={index} className={`statement-value${value.nested ? ' is-node' : ''}`}>
						{value.comments && <span className="statement-value-comment">{value.comments.join('\n')}</span>}
						<TermValue view={value} {...context} />
					</span>
				))}
			</span>
			<span className="statement-actions"></span>
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
 * A statement as fields on the grid of its card: the predicate, a field per literal with the label
 * of its language tag or datatype after the text, the resources as pills in one box with the input
 * of the next value after them, and the card of a blank node or the items of a list as they are
 * read, each with a button that removes it. The fields are plain at rest and draw their box on
 * intent. The row is written when the focus leaves it or Enter is pressed in a literal; Escape
 * gives up what was typed.
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
	const range = property?.valueKind?.kind ?? 'any';
	const indexed = state.draft.values.map((value, index) => ({ value, kind: _kindOf(_viewOf(value, services)), index }));
	const literals = indexed.filter(entry => entry.kind === 'literal');
	const resources = indexed.filter(entry => entry.kind === 'resource');
	const wholes = indexed.filter(entry => entry.kind === 'whole');

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
			<span className="statement-gutter"></span>
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
				{literals.map(({ value, index }) => (
					<span key={index} className="statement-value">
						{_commentsOf(value)}
						<EditableLiteral value={value} index={index} row={row} services={services} />
					</span>
				))}
				<span className={`statement-value is-adder${resources.length === 0 && state.draft.values.length > 0 && state.pendingText === '' ? ' is-on-intent' : ''}`}>
					<ResourceValues
						resources={resources.map(({ value, index }) => ({ view: _viewOf(value, services), index }))}
						documentResources={services.resources}
						range={range}
						pendingText={state.pendingText}
						services={services}
						placeholder={state.draft.values.length === 0 ? 'value' : 'add a value'}
						onPendingInput={row.onPendingInput}
						onPick={row.onValueAdded}
						onCreate={row.onPendingCommit}
						onRemove={row.onRemoveValue}
					/>
				</span>
				{wholes.map(({ value, index }) => (
					<span key={index} className={`statement-value${_isNode(value) ? ' is-node' : ''}`}>
						{_commentsOf(value)}
						<span className="statement-value-whole" data-value-index={index}>
							<TermValue view={_viewOf(value, services)} {...context} />
							<button type="button" className="statement-value-remove" aria-label={`Remove value ${index + 1}`} title="Remove" onClick={() => row.onRemoveValue(index)}>
								<vscode-icon name="close" size={12}></vscode-icon>
							</button>
						</span>
					</span>
				))}
			</span>
			<span className="statement-actions"></span>
			{error && <RowError message={error} onDismiss={() => editing.dismissError(cellKey)} />}
		</div>
	);
}

/**
 * Properties of the {@link EditableLiteral} component.
 */
interface EditableLiteralProps {
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
	 * Gives the datatypes their labels and the card its languages.
	 */
	services: StatementServices;
}

/**
 * A literal value of an edited statement as its field.
 * @param props The value and its row.
 * @returns The field.
 */
function EditableLiteral({ value, index, row, services }: EditableLiteralProps): React.JSX.Element | null {
	const term = _viewOf(value, services).term;

	if (term.kind !== 'literal') {
		return null;
	}

	return (
		<LiteralField
			index={index}
			text={term.value}
			tag={term.language ?? _datatypeLabel(term.datatype, services)}
			problem={row.literalProblems.get(index)}
			numeric={term.datatype !== undefined && LiteralDatatypes.isNumeric(term.datatype)}
			integer={term.datatype === XSD_INTEGER}
			languages={services.languages}
			services={services}
			onInput={text => row.onLiteralInput(index, text)}
			onTagPick={tag => row.onLiteralTag(index, tag)}
		/>
	);
}

/**
 * How a value is edited: a literal in a field of its own, a resource as a pill in the box of the
 * resources, and a blank node or a list whole, as it is read.
 * @param view The view of the value.
 * @returns The kind.
 */
function _kindOf(view: TermView): 'literal' | 'resource' | 'whole' {
	if (view.collection || view.term.kind === 'bnode') {
		return 'whole';
	}

	return view.term.kind === 'literal' ? 'literal' : 'resource';
}

/**
 * The view a value is shown with.
 * @param value The value.
 * @param services Gives typed terms their views.
 * @returns The view.
 */
function _viewOf(value: RowValue, services: StatementServices): TermView {
	return value.kind === 'written' ? value.view : services.resolver.viewOf(value.term);
}

/**
 * The comment lines written above a value, if it is written and has any.
 * @param value The value.
 * @returns The comment lines.
 */
function _commentsOf(value: RowValue): React.JSX.Element | null {
	return value.kind === 'written' && value.view.comments ? <span className="statement-value-comment">{value.view.comments.join('\n')}</span> : null;
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
 * The label of a datatype: the name the fields know it by, else its prefixed name; Text for plain
 * text.
 * @param datatype The IRI of the datatype.
 * @param services Gives the datatype its prefixed name.
 * @returns The label.
 */
function _datatypeLabel(datatype: string | undefined, services: StatementServices): string {
	if (!datatype || datatype === XSD_STRING) {
		return 'Text';
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
