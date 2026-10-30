import { FocusEvent, KeyboardEvent } from 'react';
import { PropertyView, TermView } from '../form-editor-model';
import { useRowEditorState } from '../hooks/use-row-editor-state';
import { StatementServices } from '../hooks/use-statement-services';
import { RowValue } from '../state/row-value';
import { StatementRowEditor } from '../state/statement-row-editor';
import { StatementRowState } from '../state/statement-row-state';
import { EditedRow } from './edited-row';
import { PredicateField } from './predicate-field';
import { ResourceValues } from './resource-values';
import { getRowErrorMessage } from './row-error-message';
import { RowError } from './row-error';
import { StatementRowContext } from './statement-row-context';
import { StatementValueCell } from './statement-value-cell';
import { getTermLabel, getTermTitle } from './term-labels';
import { TermValue } from './term-value';

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
 * A value of a row with the view it is shown with and its index among the values.
 */
interface ShownValue {
	/**
	 * The value.
	 */
	value: RowValue;

	/**
	 * The view of the value.
	 */
	view: TermView;

	/**
	 * The index of the value among the values of the statement.
	 */
	index: number;
}

/**
 * A statement of a card on the grid of its card: the predicate, a line per literal, the resources
 * as pills in one box, and the card of a blank node or the items of a list, each with the comment
 * lines written above it. A row that only reads shows the predicate by its label and the values as
 * they are read. An edited row shows the same layout as fields that are plain at rest and draw
 * their box on intent: the predicate field, a field per literal with the label of its language tag
 * or datatype after the text, the input of the next value after the last pill, and a button that
 * removes each value. It is written when the focus leaves it or Enter is pressed in a literal;
 * Escape gives up what was typed.
 * @param props The statement, its editor and where the row stands.
 * @returns The row.
 */
export function StatementRow({ property, editor, services, ...context }: StatementRowProps): React.JSX.Element {
	const state = useRowEditorState(editor);
	const edited: EditedRow | undefined = editor && state && services ? { editor, state, services } : undefined;
	const values = _shownValues(state?.draft.values ?? property?.values.map(view => ({ kind: 'written' as const, view })) ?? [], services);
	const literals = values.filter(entry => _kindOf(entry.view) === 'literal');
	const resources = values.filter(entry => _kindOf(entry.view) === 'resource');
	const wholes = values.filter(entry => _kindOf(entry.view) === 'whole');
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
			<span className="statement-gutter"></span>
			<span className="statement-predicate" title={edited ? undefined : predicateView && getTermTitle(predicateView.term)}>
				{edited ? <PredicateField editor={edited.editor} state={edited.state} label={label} /> : label}
			</span>
			<span className="statement-values">
				{literals.map(entry => <StatementValueCell key={entry.index} {...entry} edited={edited} {...context} />)}
				{edited ? _resourceBox(edited, resources, property) : _resourcePills(resources, context)}
				{wholes.map(entry => <StatementValueCell key={entry.index} {...entry} edited={edited} {...context} />)}
			</span>
			<span className="statement-actions"></span>
			{error && <RowError message={error} onDismiss={state?.rejection ? () => editor?.dismissRejection() : undefined} />}
		</div>
	);
}

/**
 * The box of the resources of an edited row, with the input of the next value after the pills. In
 * a row of literals only, the input shows while the focus is in the row.
 * @param edited The row.
 * @param resources The resources of the row.
 * @param property The property of the row, whose values tell what the predicate takes.
 * @returns The box.
 */
function _resourceBox(edited: EditedRow, resources: readonly ShownValue[], property: PropertyView | undefined): React.JSX.Element {
	const { editor, state, services } = edited;
	const onIntent = resources.length === 0 && state.draft.values.length > 0 && state.pendingText === '';

	return (
		<span className={`statement-value is-adder${onIntent ? ' is-on-intent' : ''}`}>
			<ResourceValues
				resources={resources.map(({ view, index }) => ({ view, index }))}
				documentResources={services.resources}
				range={property?.valueKind?.kind ?? 'any'}
				pendingText={state.pendingText}
				services={services}
				placeholder={state.draft.values.length === 0 ? 'value' : 'add a value'}
				onPendingInput={text => editor.inputPending(text)}
				onPick={term => editor.addValue(term)}
				onCreate={() => editor.commitPending()}
				onRemove={index => editor.removeValue(index)}
			/>
		</span>
	);
}

/**
 * The resources of a row that only reads, as pills that lead to them.
 * @param resources The resources of the row.
 * @param context Where the row stands.
 * @returns The pills, or nothing for a row without resources.
 */
function _resourcePills(resources: readonly ShownValue[], context: StatementRowContext): React.JSX.Element | null {
	if (resources.length === 0) {
		return null;
	}

	return (
		<span className="statement-value">
			<span className="value-pills">
				{resources.map(({ view, index }) => <TermValue key={index} view={view} {...context} />)}
			</span>
		</span>
	);
}

/**
 * The values of a row with the views they are shown with.
 * @param values The values.
 * @param services Gives typed terms their views, where the row is edited.
 * @returns The values in order.
 */
function _shownValues(values: readonly RowValue[], services: StatementServices | undefined): ShownValue[] {
	return values.map((value, index) => ({
		value,
		view: value.kind === 'written' ? value.view : services?.resolver.viewOf(value.term) ?? { term: value.term, editable: false },
		index
	}));
}

/**
 * How a value is laid out: a literal on a line of its own, a resource as a pill in the box of the
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
 * The view of the predicate an edited row names, once it names one.
 * @param state The state of the row.
 * @param services Gives the predicate its label.
 * @returns The view, or `undefined` while the row names no predicate.
 */
function _editedPredicateView(state: StatementRowState, services: StatementServices): TermView | undefined {
	return state.draft.predicate ? services.resolver.viewOf({ kind: 'iri', iri: state.draft.predicate }) : undefined;
}
