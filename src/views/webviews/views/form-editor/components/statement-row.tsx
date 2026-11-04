import { FocusEvent, KeyboardEvent, useState } from 'react';
import { RDF } from '@faubulous/mentor-rdf/ontologies';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { PropertyView, TermView } from '../form-editor-model';
import { useRowEditorState } from '../hooks/use-row-editor-state';
import { StatementServices } from '../hooks/use-statement-services';
import { LanguageFilter } from '../state/language-filter';
import { RowValue } from '../state/row-value';
import { useFormEditorContext } from '../state/form-editor-context';
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
 * The header of the nested card of a blank node, which the row of its type leads.
 */
export interface NestedCardHeader {
	/**
	 * Whether the card shows only its header.
	 */
	collapsed: boolean;

	/**
	 * The other properties of the node, named in the header while the card is collapsed.
	 */
	summary: string;

	/**
	 * Collapse or expand the card.
	 */
	onToggle: () => void;
}

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

	/**
	 * Whether the predicate field takes the focus when the row appears, as for a row opened by Add
	 * property.
	 */
	autoFocus?: boolean;

	/**
	 * Whether an edited row offers a button that removes its property, as the rows of a nested
	 * blank node do.
	 */
	removable?: boolean;

	/**
	 * The header of the nested card of a blank node, where the row is the type that leads it.
	 */
	header?: NestedCardHeader;
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
 * removes each value, and in the nested card of a blank node one that removes the property. It is
 * written when the focus leaves it or Enter is pressed in a literal; Escape gives up what was
 * typed. Keys pressed in the rows of a blank node shown in the row are theirs. While the form shows
 * one language, the literals of the others are left out, and an edited row whose literals lack the
 * language has an empty field for it.
 * @param props The statement, its editor and where the row stands.
 * @returns The row.
 */
export function StatementRow({ property, editor, services, autoFocus, removable, header, ...context }: StatementRowProps): React.JSX.Element {
	const state = useRowEditorState(editor);
	const edited: EditedRow | undefined = editor && state && services ? { editor, state, services } : undefined;
	const { languageFilter = LanguageFilter.ALL } = useFormEditorContext();
	const values = _shownValues(state?.draft.values ?? property?.values.map(view => ({ kind: 'written' as const, view })) ?? [], services, languageFilter);
	const literals = [...values.filter(entry => _kindOf(entry.view) === 'literal'), ..._missingLanguageField(edited, languageFilter)];
	const resources = values.filter(entry => _kindOf(entry.view) === 'resource');
	const wholes = values.filter(entry => _kindOf(entry.view) === 'whole');
	const predicateView = edited ? _editedPredicateView(edited.state, edited.services) : property?.predicate;
	const label = predicateView ? getTermLabel(predicateView) : state?.predicateText ?? '';
	const error = state ? getRowErrorMessage(state) : undefined;
	const [addingValue, setAddingValue] = useState(false);
	// A row of blank nodes only offers Add value under their cards, not the input of a new value.
	const asksToAdd = edited !== undefined && !header && literals.length === 0 && resources.length === 0 && wholes.length > 0 && edited.state.pendingText === '' && !addingValue;

	const handleKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
		if (!_isOwnEvent(event)) {
			return;
		}

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
			setAddingValue(false);
			editor?.leave();
		}
	};

	return (
		<div
			className={`statement-line${edited ? ' is-editable' : ''}${editor?.isNew && !header ? ' is-draft' : ''}${header ? ' is-card-header' : ''}`}
			role="group"
			aria-label={header ? 'Type' : editor?.isNew ? 'New statement' : label}
			tabIndex={edited ? -1 : undefined}
			onKeyDown={edited ? handleKeyDown : undefined}
			onBlur={edited ? handleBlur : undefined}
		>
			<span className="statement-gutter">{header && _chevron(header)}</span>
			<span className="statement-predicate" title={header ? RDF.type : edited ? undefined : predicateView && getTermTitle(predicateView.term)}>
				{header ? 'type' : edited ? <PredicateField editor={edited.editor} state={edited.state} label={label} autoFocus={autoFocus} /> : label}
			</span>
			<span className="statement-values">
				{literals.map(entry => <StatementValueCell key={entry.index} {...entry} edited={edited} {...context} />)}
				{edited ? !asksToAdd && _resourceBox(edited, resources, property, { isType: header !== undefined, autoFocus: addingValue }) : _resourcePills(resources, context)}
				{wholes.map(entry => <StatementValueCell key={entry.index} {...entry} edited={edited} {...context} />)}
				{asksToAdd && <button type="button" className="statement-value-add" onClick={() => setAddingValue(true)}>Add value</button>}
				{header?.collapsed && header.summary && <span className="nested-card-summary">{header.summary}</span>}
			</span>
			<span className="statement-actions">
				{removable && !header && edited && !edited.editor.isNew && (
					<button type="button" className="statement-row-remove" aria-label={`Remove ${label}`} title="Remove property" onClick={() => edited.editor.removeProperty()}>
						<vscode-icon name="close" size={12}></vscode-icon>
					</button>
				)}
			</span>
			{error && <RowError message={error} onDismiss={state?.rejection ? () => editor?.dismissRejection() : undefined} />}
		</div>
	);
}

/**
 * Indicate whether an event comes from the fields of a row itself rather than from the rows of a
 * blank node shown in it.
 * @param event The event.
 * @returns `true` when the closest row of its target is the row handling it.
 */
function _isOwnEvent(event: KeyboardEvent<HTMLElement>): boolean {
	return event.target instanceof Element && event.target.closest('.statement-line') === event.currentTarget;
}

/**
 * The button that collapses and expands the nested card of a blank node.
 * @param header The header of the card.
 * @returns The button.
 */
function _chevron(header: NestedCardHeader): React.JSX.Element {
	return (
		<button type="button" className="nested-card-chevron" aria-expanded={!header.collapsed} aria-label={header.collapsed ? 'Expand' : 'Collapse'} title={header.collapsed ? 'Expand' : 'Collapse'} onClick={header.onToggle}>
			<vscode-icon name={header.collapsed ? 'chevron-right' : 'chevron-down'} size={14}></vscode-icon>
		</button>
	);
}

/**
 * The box of the resources of an edited row, with the input of the next value after the pills. In a
 * row without pills it stands after the nested cards of blank nodes, and in a row with values it
 * shows while the focus is in the row. The type of a blank node offers the classes of the document
 * and asks to choose one while there is none. `[` typed into the empty input starts a new blank
 * node where the predicate takes resources.
 * @param edited The row.
 * @param resources The resources of the row.
 * @param property The property of the row, whose values tell what the predicate takes.
 * @param options Whether the row is the type of a blank node, and whether the input takes the focus.
 * @returns The box.
 */
function _resourceBox(edited: EditedRow, resources: readonly ShownValue[], property: PropertyView | undefined, options: { isType: boolean; autoFocus: boolean }): React.JSX.Element {
	const { isType, autoFocus } = options;
	const { editor, state, services } = edited;
	const range = isType ? 'resource' : property?.valueKind?.kind ?? 'any';
	const onIntent = resources.length === 0 && state.draft.values.length > 0 && state.pendingText === '';
	const classes = ['statement-value', 'is-adder', ...(resources.length === 0 ? ['is-after-values'] : []), ...(onIntent ? ['is-on-intent'] : [])];

	return (
		<span className={classes.join(' ')}>
			<ResourceValues
				resources={resources.map(({ view, index }) => ({ view, index }))}
				documentResources={isType ? services.classes : services.resources}
				range={range}
				pendingText={state.pendingText}
				services={services}
				placeholder={_placeholderOf(state.draft.values.length, isType)}
				onPendingInput={text => editor.inputPending(text)}
				onPick={term => editor.addValue(term)}
				onCreate={() => editor.commitPending()}
				onRemove={index => editor.removeValue(index)}
				onStartNode={!isType && range !== 'literal' ? () => editor.addNode() : undefined}
				autoFocus={autoFocus}
			/>
		</span>
	);
}

/**
 * The placeholder of the input of the next value.
 * @param valueCount The number of values of the row.
 * @param isType Whether the row is the type of a blank node.
 * @returns The placeholder.
 */
function _placeholderOf(valueCount: number, isType: boolean): string {
	if (valueCount > 0) {
		return 'add a value';
	}

	return isType ? 'Choose type' : 'value';
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
 * The values of a row the form shows, with the views they are shown with.
 * @param values The values.
 * @param services Gives typed terms their views, where the row is edited.
 * @param languageFilter Which literals are shown.
 * @returns The values in order, those of other languages left out.
 */
function _shownValues(values: readonly RowValue[], services: StatementServices | undefined, languageFilter: LanguageFilter): ShownValue[] {
	return values.flatMap((value, index): ShownValue[] => {
		const view = value.kind === 'written' ? value.view : services?.resolver.viewOf(value.term) ?? { term: value.term, editable: false };

		return languageFilter.shows(view.term) ? [{ value, view, index }] : [];
	});
}

/**
 * The empty field of the language an edited row lacks. It takes the index the value typed into it
 * gets, so the field stays the same while it turns into that value.
 * @param edited The row, if it is edited.
 * @param languageFilter Which language is shown.
 * @returns The field, or nothing when the row does not lack the language.
 */
function _missingLanguageField(edited: EditedRow | undefined, languageFilter: LanguageFilter): ShownValue[] {
	const values = edited?.state.draft.values;

	if (!edited || edited.editor.isNew || !values || languageFilter.language === undefined || !languageFilter.lacksLanguage(values)) {
		return [];
	}

	const term = RdfDataFactory.literal('', languageFilter.language);

	return [{ value: { kind: 'term', term }, view: { term, editable: true }, index: values.length }];
}

/**
 * How a value is laid out: a literal on a line of its own, a resource as a pill in the box of the
 * resources, and a blank node or a list whole, as it is read.
 * @param view The view of the value.
 * @returns The kind.
 */
function _kindOf(view: TermView): 'literal' | 'resource' | 'whole' {
	if (view.collection || view.term.termType === 'BlankNode') {
		return 'whole';
	}

	return view.term.termType === 'Literal' ? 'literal' : 'resource';
}

/**
 * The view of the predicate an edited row names, once it names one.
 * @param state The state of the row.
 * @param services Gives the predicate its label.
 * @returns The view, or `undefined` while the row names no predicate.
 */
function _editedPredicateView(state: StatementRowState, services: StatementServices): TermView | undefined {
	return state.draft.predicate ? services.resolver.viewOf(RdfDataFactory.namedNode(state.draft.predicate)) : undefined;
}
