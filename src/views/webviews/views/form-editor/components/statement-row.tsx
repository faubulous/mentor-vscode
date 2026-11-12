import { FocusEvent, KeyboardEvent, useRef, useState } from 'react';
import { RDF } from '@faubulous/mentor-rdf/ontologies';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { ValueKind } from '@src/utilities/value-kind';
import { ScopeKey } from '@src/utilities/config-scope';
import { NamespaceInfo, PropertyView, TermView } from '../form-editor-model';
import { useRowEditorState } from '../hooks/use-row-editor-state';
import { StatementServices } from '../hooks/use-statement-services';
import { FormEditorShortcuts } from '../form-editor-shortcuts';
import { LanguageFilter } from '../state/language-filter';
import { RowValue } from '../state/row-value';
import { useFormEditorContext } from '../state/form-editor-context';
import { StatementRowEditor } from '../state/statement-row-editor';
import { StatementRowState } from '../state/statement-row-state';
import { PinnedProperties, usePinnedProperties } from '../state/pinned-properties-context';
import { getLiteralFieldTag, getLiteralTag } from './datatype-labels';
import { EditedRow } from './edited-row';
import { RowMenu } from './row-menu';
import { PredicateField } from './predicate-field';
import { PredicateTags } from './predicate-tags';
import { PropertyComments } from './property-comments';
import { ResourceValues } from './resource-values';
import { getRowErrorMessage } from './row-error-message';
import { RowError } from './row-error';
import { StatementRowContext } from './statement-row-context';
import { StatementValueCell } from './statement-value-cell';
import { getResourceTooltipAttributes } from './resource-tooltip';
import { getTermLabel } from './term-labels';
import { TermValue } from './term-value';

/**
 * The header of the nested card of a blank node, which the row of its type leads.
 */
interface NestedCardHeader {
	/**
	 * Tells the header of a nested card apart.
	 */
	kind: 'type';

	/**
	 * Whether the card shows only its header.
	 */
	collapsed: boolean;

	/**
	 * The other properties of the node, named in the header while the card is collapsed.
	 */
	summary: string;

	/**
	 * The pinned properties the node has, with their values, which the header shows in place of
	 * the summary while the card is collapsed.
	 */
	pinned?: PinnedSummaryItem[];

	/**
	 * The comment lines written above the node, shown in the header as its caption.
	 */
	caption?: string[];

	/**
	 * Collapse or expand the card.
	 */
	onToggle: () => void;
}

/**
 * A pinned property of a nested card as its collapsed header names it.
 */
interface PinnedSummaryItem {
	/**
	 * The label of the predicate.
	 */
	label: string;

	/**
	 * The values, by their labels.
	 */
	text: string;
}

/**
 * The label row of an expanded card of the list, which leads its rows.
 */
interface CardLabelHeader {
	/**
	 * Tells the label row of a card apart.
	 */
	kind: 'label';
}

/**
 * The header a row is, if it leads its card: the type of a nested card or the label of a card of
 * the list.
 */
export type RowHeader = NestedCardHeader | CardLabelHeader;

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
	 * Whether the predicate field takes the focus when the row appears, as in a row Add property
	 * opened.
	 */
	autoFocus?: boolean;

	/**
	 * The header the row is, where it leads its card.
	 */
	header?: RowHeader;
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
 * lines written above it, and the comment lines written above the statement under its values. A
 * row that only reads shows the predicate by its label and the values as they are read. An edited
 * row shows the same layout as fields that are plain at rest and draw their box on intent: the
 * predicate field, a field per literal with the label of its language tag or datatype after the
 * text, the input of the next value after the last pill, and a button that removes each value. Its
 * ⋮ menu pins the property and removes it with all its values, as its shortcut does in the row. A
 * header row without a value
 * asks for it with a link that turns into the input in place. The row is written when the focus
 * leaves it or Enter is pressed in a literal; Escape gives up what was typed. Keys pressed in the
 * rows of a blank node shown in the row are theirs. While the form shows one language, the
 * literals of the others are left out, and an edited row whose literals lack the language has an
 * empty field for it.
 * @param props The statement, its editor and where the row stands.
 * @returns The row.
 */
export function StatementRow({ property, editor, services, autoFocus = false, header, ...context }: StatementRowProps): React.JSX.Element {
	const state = useRowEditorState(editor);
	const edited: EditedRow | undefined = editor && state && services ? { editor, state, services } : undefined;
	const { languageFilter = LanguageFilter.ALL, pinScopes = [], languageTags, namespaces } = useFormEditorContext();
	const rowRef = useRef<HTMLDivElement>(null);
	const cardPins = usePinnedProperties();
	const values = _shownValues(state?.draft.values ?? property?.values.map(view => ({ kind: 'written' as const, view })) ?? [], services, languageFilter);
	const literals = [...values.filter(entry => _kindOf(entry.view) === 'literal'), ..._missingLanguageField(edited, languageFilter)];
	const resources = values.filter(entry => _kindOf(entry.view) === 'resource');
	const wholes = values.filter(entry => _kindOf(entry.view) === 'whole');
	const predicateView = edited ? _editedPredicateView(edited.state, edited.services) : property?.predicate;
	const label = predicateView ? getTermLabel(predicateView) : state?.predicateText ?? '';
	const error = state ? getRowErrorMessage(state) : undefined;
	const rowKind = _rowKindOf(literals.length, resources.length, wholes.length);
	const [addingValue, setAddingValue] = useState(false);
	// A collapsed nested card shows its type, but does not ask for a missing one: without a type it
	// leaves out the label of the type too, and its summary takes the row.
	const folded = header?.kind === 'type' && header.collapsed;
	const typeless = folded && resources.length === 0;
	const addLink = edited && !addingValue && !folded ? _addLinkOf(edited, header, literals.length, resources.length, wholes.length) : undefined;
	// The label row is the title of its card: it offers the input of a new value only while the
	// resource has no label, and the label of another language comes through the language picker.
	const titled = header?.kind === 'label' && literals.length > 0;

	const handleKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
		if (!_isOwnEvent(event)) {
			return;
		}

		if (FormEditorShortcuts.Remove.matches(event) && !header && editor && !editor.isNew) {
			event.preventDefault();
			event.stopPropagation();
			editor.removeProperty();
		} else if (event.key === 'Escape') {
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
			ref={rowRef}
			className={`statement-line is-${rowKind}-row${edited ? ' is-editable' : ''}${editor?.isNew && !header ? ' is-draft' : ''}${_headerClassOf(header)}${typeless ? ' is-typeless' : ''}`}
			role="group"
			aria-label={header ? _headerLabelOf(header) : editor?.isNew ? 'New statement' : label}
			data-predicate={_predicateIriOf(predicateView)}
			tabIndex={edited ? -1 : undefined}
			onKeyDown={edited ? handleKeyDown : undefined}
			onBlur={edited ? handleBlur : undefined}
		>
			{header?.kind === 'type' && <span className="statement-gutter">{_chevron(header)}</span>}
			{header
				? !typeless && _headerPredicateOf(header, edited, label)
				: (
					<span className={`statement-predicate${_isIriLabel(predicateView, label) ? ' is-iri' : ''}`} {...getResourceTooltipAttributes(edited ? undefined : predicateView?.term)}>
						{edited ? <PredicateField editor={edited.editor} state={edited.state} label={label} autoFocus={autoFocus} /> : <span className="statement-predicate-text">{label}</span>}
						{wholes.length > 0 && <span className="statement-predicate-count">{wholes.length}</span>}
						<PredicateTags
							tags={_tagsOf(literals, edited, languageTags, namespaces)}
							onOpen={edited ? index => rowRef.current?.querySelector<HTMLElement>(`[data-value-index="${index}"] .literal-field-tag`)?.click() : undefined}
						/>
					</span>
				)}
			<span className="statement-values">
				{literals.map(entry => <StatementValueCell key={entry.index} {...entry} edited={edited} {...context} />)}
				{edited && !(folded && resources.length === 0) ? !addLink && !titled && _resourceBox(edited, resources, property, { header: header?.kind, autoFocus: addingValue, label }) : _resourcePills(resources, context)}
				{wholes.map(entry => <StatementValueCell key={entry.index} {...entry} edited={edited} {...context} />)}
				{addLink && <button type="button" className="add-link statement-value-add" onClick={() => setAddingValue(true)}>{addLink}</button>}
				{header?.kind === 'type' && header.collapsed && _collapsedSummaryOf(header)}
				{header?.kind === 'type' && header.caption && <span className="nested-card-caption">{header.caption.join('\n')}</span>}
				{property && <PropertyComments property={property} />}
			</span>
			<span className="statement-actions">
				{!header && _rowMenuOf(predicateView, label, cardPins, pinScopes, edited)}
			</span>
			{error && <RowError message={error} onDismiss={state?.rejection ? () => editor?.dismissRejection() : undefined} />}
		</div>
	);
}

/**
 * What the header of a collapsed nested card names after its type: the pinned properties of the
 * node with their values, else the other properties of the node.
 * @param header The header.
 * @returns The summary, or nothing when the node has no other properties.
 */
function _collapsedSummaryOf(header: NestedCardHeader): React.JSX.Element | null {
	if (header.pinned && header.pinned.length > 0) {
		return (
			<span className="nested-card-summary is-pinned">
				{header.pinned.map(item => (
					<span key={item.label} className="nested-card-pinned">
						<span className="nested-card-pinned-label">{item.label}</span> {item.text}
					</span>
				))}
			</span>
		);
	}

	return header.summary ? <span className="nested-card-summary">{header.summary}</span> : null;
}

/**
 * The ⋮ menu of a row: the pin of its predicate, for a predicate other than the type where the
 * resource of its card, or the blank node of its nested card, can pin, and Remove, which removes
 * the property with all its values, where the row is written. A row for a new statement has none.
 * @param predicateView The predicate of the row, once it names one.
 * @param label The label of the predicate.
 * @param cardPins The pins of the card.
 * @param pinScopes The settings a property can be pinned in.
 * @param edited The row, where it is edited.
 * @returns The menu, or nothing.
 */
function _rowMenuOf(predicateView: TermView | undefined, label: string, cardPins: PinnedProperties, pinScopes: readonly ScopeKey[], edited: EditedRow | undefined): React.JSX.Element | null {
	const predicate = predicateView?.term;
	const onPin = cardPins.onPin;

	if (predicate?.termType !== 'NamedNode' || edited?.editor.isNew) {
		return null;
	}

	const pinnable = onPin !== undefined && predicate.value !== RDF.type;
	const scope = cardPins.pins.find(pin => pin.predicate.equals(predicate))?.scope;

	return (
		<RowMenu
			label={label}
			scope={pinnable ? scope : undefined}
			pinScopes={pinScopes}
			onPin={pinnable ? next => onPin(predicate, next) : undefined}
			onRemove={edited ? () => edited.editor.removeProperty() : undefined}
		/>
	);
}

/**
 * The IRI of the predicate of a row, which a pinned field of a collapsed card finds the row by.
 * @param predicateView The predicate, once the row names one.
 * @returns The IRI, or `undefined`.
 */
function _predicateIriOf(predicateView: TermView | undefined): string | undefined {
	return predicateView?.term.termType === 'NamedNode' ? predicateView.term.value : undefined;
}

/**
 * The language tags and datatypes of the literals of a row, which a narrow card shows under the
 * label: as their fields name them where the row is edited, as they are read otherwise.
 * @param literals The literals of the row.
 * @param edited The row, where it is edited.
 * @param languageTags The spellings of the language tags of the document.
 * @param namespaces The namespace declarations of the document.
 * @returns The tags, by the index of their values.
 */
function _tagsOf(literals: readonly ShownValue[], edited: EditedRow | undefined, languageTags: Readonly<Record<string, string>>, namespaces: readonly NamespaceInfo[]): { index: number; tag: string }[] {
	return literals.flatMap(({ view, index }) => {
		if (view.term.termType !== 'Literal') {
			return [];
		}

		const tag = edited
			? getLiteralFieldTag(view.term, languageTags, datatype => edited.services.resolver.viewOf(datatype).prefixedName)
			: getLiteralTag(view.term, languageTags, namespaces);

		return tag ? [{ index, tag }] : [];
	});
}

/**
 * Indicate whether a row names its predicate by the IRI, which is then cut at its start, so the
 * local name stays in view.
 * @param predicateView The predicate.
 * @param label The label the row shows.
 * @returns `true` when the label is the IRI.
 */
function _isIriLabel(predicateView: TermView | undefined, label: string): boolean {
	return predicateView?.term.termType === 'NamedNode' && label === predicateView.term.value;
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
 * The class a header row is styled by.
 * @param header The header, if the row is one.
 * @returns The class, with its leading space, or nothing.
 */
function _headerClassOf(header: RowHeader | undefined): string {
	if (!header) {
		return '';
	}

	return header.kind === 'type' ? ' is-card-header' : ' is-card-label';
}

/**
 * What a header row is called for assistive technology.
 * @param header The header.
 * @returns The name.
 */
function _headerLabelOf(header: RowHeader): string {
	return header.kind === 'type' ? 'Type' : 'Label';
}

/**
 * The predicate of a header row: "type" for a nested card, and the label predicate of a card of
 * the list by its own label, so that it is not mistaken for another, in the predicate field of any
 * row where the row is edited.
 * @param header The header.
 * @param edited The row, where it is edited.
 * @param label The label of the predicate of the row.
 * @returns The predicate cell.
 */
function _headerPredicateOf(header: RowHeader, edited: EditedRow | undefined, label: string): React.JSX.Element {
	if (header.kind === 'type') {
		return <span className="statement-predicate" {...getResourceTooltipAttributes(RdfDataFactory.namedNode(RDF.type))}>type</span>;
	}

	return (
		<span className="statement-predicate">
			{edited ? <PredicateField editor={edited.editor} state={edited.state} label={label} /> : label}
		</span>
	);
}

/**
 * The button that collapses and expands the nested card of a blank node.
 * @param header The header of the card.
 * @returns The button.
 */
function _chevron(header: NestedCardHeader): React.JSX.Element {
	return (
		<button type="button" className="icon-button is-small nested-card-chevron" aria-expanded={!header.collapsed} aria-label={header.collapsed ? 'Expand' : 'Collapse'} title={header.collapsed ? 'Expand' : 'Collapse'} onClick={header.onToggle}>
			<vscode-icon name={header.collapsed ? 'chevron-right' : 'chevron-down'} size={14}></vscode-icon>
		</button>
	);
}

/**
 * The text of the link an edited row without a value asks for one with, which turns into the
 * input in place: a header row asks to choose the type or to add the label, and a row of blank
 * nodes only offers Add value under their cards, so nothing moves above a click into a card.
 * @param edited The row.
 * @param header The header the row is, if it is one.
 * @param literals The number of literal fields of the row.
 * @param resources The number of pills of the row.
 * @param wholes The number of blank nodes and lists of the row.
 * @returns The text, or `undefined` for a row that shows its input.
 */
function _addLinkOf(edited: EditedRow, header: RowHeader | undefined, literals: number, resources: number, wholes: number): string | undefined {
	if (literals > 0 || resources > 0 || edited.state.pendingText !== '') {
		return undefined;
	}

	if (header && wholes === 0) {
		return _placeholderOf(0, header.kind, '');
	}

	return !header && wholes > 0 ? 'Add value' : undefined;
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
 * @param options The kind of header the row is, whether the input takes the focus, and the label
 * of the predicate, which the input of an empty row asks to add a value for.
 * @returns The box.
 */
function _resourceBox(edited: EditedRow, resources: readonly ShownValue[], property: PropertyView | undefined, options: { header?: RowHeader['kind']; autoFocus: boolean; label: string }): React.JSX.Element {
	const { header, autoFocus, label } = options;
	const isType = header === 'type';
	const { editor, state, services } = edited;
	const range = _rangeOf(header, property);
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
				placeholder={_placeholderOf(state.draft.values.length, header, label)}
				onPendingInput={text => editor.inputPending(text)}
				onPick={term => editor.addValue(term)}
				onCreate={() => editor.commitPending()}
				onRemove={index => editor.removeValue(index)}
				onStartNode={!header && range !== 'literal' ? () => editor.addNode() : undefined}
				autoFocus={autoFocus}
			/>
		</span>
	);
}

/**
 * What the input of the next value of a row reads typed text as: resources for a type, text for a
 * label, and otherwise what the values of the property tell.
 * @param header The kind of header the row is, if it is one.
 * @param property The property of the row.
 * @returns The kind of values.
 */
function _rangeOf(header: RowHeader['kind'] | undefined, property: PropertyView | undefined): ValueKind {
	if (header) {
		return header === 'type' ? 'resource' : 'literal';
	}

	return property?.valueKind?.kind ?? 'any';
}

/**
 * The placeholder of the input of the next value, which a row with values leaves empty: an empty
 * row asks to add a value for its predicate, by its label.
 * @param valueCount The number of values of the row.
 * @param header The kind of header the row is, if it is one.
 * @param label The label of the predicate of the row, empty while it has none.
 * @returns The placeholder.
 */
function _placeholderOf(valueCount: number, header: RowHeader['kind'] | undefined, label: string): string {
	if (valueCount > 0) {
		return '';
	}

	switch (header) {
		case 'type':
			return 'Choose type';
		case 'label':
			return 'Add label';
		default:
			return label ? `Add ${label}` : 'value';
	}
}

/**
 * The kind of a row, by the values it leads with, which decides how tall it is and where its
 * predicate sits: a literal row of fields, a resource row of pills, or a nested row of the cards
 * of blank nodes and lists. A row without values is a resource row, as its input is.
 * @param literals The number of literal fields of the row.
 * @param resources The number of pills of the row.
 * @param wholes The number of blank nodes and lists of the row.
 * @returns The kind.
 */
function _rowKindOf(literals: number, resources: number, wholes: number): 'literal' | 'resource' | 'nested' {
	if (literals > 0) {
		return 'literal';
	}

	return resources === 0 && wholes > 0 ? 'nested' : 'resource';
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
		const view = value.kind === 'written' ? value.view : value.node?.copyOf ?? services?.resolver.viewOf(value.term) ?? { term: value.term, editable: false };

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
