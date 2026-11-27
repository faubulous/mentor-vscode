import { FocusEvent, KeyboardEvent, ReactNode, useEffect, useRef, useState } from 'react';
import { RDF } from '@faubulous/mentor-rdf/ontologies';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { ScopeKey } from '@src/utilities/config-scope';
import { NamespaceData, PredicateData, TermData, TermSearchTargetType } from '../form-editor-model';
import { ContextMenu, useContextMenu } from '../hooks/use-context-menu';
import { RowReorder } from '../hooks/use-row-reorder';
import { usePredicateRange } from '../hooks/use-predicate-range';
import { useRowEditorState } from '../hooks/use-row-editor-state';
import { StatementServices } from '../hooks/use-statement-services';
import { FormEditorShortcuts } from '../form-editor-shortcuts';
import { LanguageFilter } from '../state/language-filter';
import { DefaultValueType, getDefaultAnnotation, getDefaultValueType, startsLiteral } from '../state/new-value-type';
import { RowValue } from '../state/row-value';
import { useFormEditorContext } from '../state/form-editor-context';
import { CommentDraft, CommentScope } from '../state/comment-scope';
import { getCommentTarget } from '../state/comment-editor';
import { StatementRowEditor } from '../state/statement-row-editor';
import { StatementRowState } from '../state/statement-row-state';
import { PinnedProperties, usePinnedProperties } from '../state/pinned-properties-context';
import { getLiteralAnnotation, getPrefixedNameIn, PrefixedNameOf } from './datatype-labels';
import { EditedRow } from './edited-row';
import { RowGrip } from './row-grip';
import { RowMenu } from './row-menu';
import { PredicateField } from './predicate-field';
import { PredicateAnnotations } from './predicate-annotations';
import { CommentField } from './comment-field';
import { CommentLine } from './comment-line';
import { ResourceValues } from './resource-values';
import { getRowErrorMessage } from './row-error-message';
import { RowError } from './row-error';
import { StatementRowContext } from './statement-row-context';
import { StatementValueCell } from './statement-value-cell';
import { LiteralAnnotationPickerSelection } from './literal-annotation-picker-items';
import { getResourceTooltipAttributes } from './resource-tooltip';
import { getTermLabel } from '@src/services/resource/term-labels';
import { TermValue } from './term-value';
import { ValuePill } from './value-pill';

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
	 * The comment written at the head of the node, shown in the header as its caption.
	 */
	caption?: ReactNode;

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
	property?: PredicateData;

	/**
	 * Edits the row; absent for a row that only reads.
	 */
	editor?: StatementRowEditor;

	/**
	 * The values the reasoner infers for the predicate of an edited row, which it shows after those
	 * it edits, read-only.
	 */
	inferredValues?: readonly TermData[];

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

	/**
	 * How the row moves among the rows of its card, where it takes part.
	 */
	reorder?: RowReorder;
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
	view: TermData;

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
 * ⋮ menu pins the property and removes it with all its values, as its shortcut does in the row, and
 * the grip before it moves it among the rows of its card. A header row without a value
 * asks for it with a link that turns into the input in place. The row is written when the focus
 * leaves it or Enter is pressed in a literal; Escape gives up what was typed. Keys pressed in the
 * rows of a blank node shown in the row are theirs. While the form shows one language, the
 * literals of the others are left out, and an edited row whose literals lack the language has an
 * empty field for it.
 * @param props The statement, its editor and where the row stands.
 * @returns The row.
 */
export function StatementRow({ property, editor, inferredValues = [], services, autoFocus = false, header, reorder, ...context }: StatementRowProps): React.JSX.Element {
	const state = useRowEditorState(editor);
	const rowRef = useRef<HTMLDivElement>(null);
	const [valueFocus, setValueFocus] = useState<{ index: number; caret?: number }>();
	const [newValueFocus, setNewValueFocus] = useState(false);
	const range = usePredicateRange(editor?.subject, state?.draft.predicate, property);
	const defaultType = getDefaultValueType(header?.kind, state?.draft.values ?? [], range);
	const edited: EditedRow | undefined = editor && state && services
		? { editor, state, services, defaultType, focusNewValue: () => _focusNewValueField(rowRef.current), focusValue: (index, caret) => setValueFocus({ index, caret }) }
		: undefined;
	const { languageFilter = LanguageFilter.ALL, pinScopes = [], namespaces } = useFormEditorContext();
	const { menuRef, openOnContextMenu } = useContextMenu();
	const cardPins = usePinnedProperties();
	const values = _shownValues(state?.draft.values ?? property?.values.map(view => ({ kind: 'written' as const, view })) ?? [], services, languageFilter);
	const literals = [...values.filter(entry => _kindOf(entry.view) === 'literal'), ..._missingLanguageField(edited, languageFilter)];
	const resources = values.filter(entry => _kindOf(entry.view) === 'resource');
	const wholes = values.filter(entry => _kindOf(entry.view) === 'whole');
	const inferred = _shownValues(inferredValues.map(view => ({ kind: 'written' as const, view })), services, languageFilter);
	const predicateView = edited ? _editedPredicateView(edited.editor, edited.state, edited.services) : property?.predicate;
	const label = predicateView ? getTermLabel(predicateView) : state?.predicateText ?? '';
	const error = state ? getRowErrorMessage(state) : undefined;
	const rowKind = _rowKindOf(literals.length, resources.length, wholes.length);
	const [addingValue, setAddingValue] = useState(false);
	const [draftComment, setDraftComment] = useState<CommentDraft>();
	// A collapsed nested card shows its type without the label of its predicate, which would take
	// room from the summary, and does not ask for a missing type.
	const folded = header?.kind === 'type' && header.collapsed;
	const addLink = edited && !addingValue && !folded ? _addLinkOf(edited, header, literals.length, resources.length, wholes.length) : undefined;
	// The label row is the title of its card: it offers the input of a new value only while the
	// resource has no label, and the label of another language comes through the language picker.
	const scope: CommentScope = {
		subject: context.visited[context.visited.length - 1],
		card: context.visited[0],
		predicate: _predicateIriOf(predicateView),
		version: context.dataService.version,
		draft: draftComment,
		onDraft: edited ? setDraftComment : undefined,
		onDraftDone: () => setDraftComment(undefined)
	};
	const titled = header?.kind === 'label' && literals.length > 0;
	// The inferred resources of an edited row stand in its box, after the resources it edits.
	const boxed = edited !== undefined && !(folded && resources.length === 0) && !addLink && !titled;
	const inferredResources = inferred.filter(entry => _kindOf(entry.view) === 'resource');
	const propertyComment = property && _propertyCommentOf(property, scope);

	// A literal just started takes the focus once it is shown.
	useEffect(() => {
		if (valueFocus && _focusLiteralField(rowRef.current, valueFocus.index, valueFocus.caret)) {
			setValueFocus(undefined);
		}
	}, [valueFocus, state]);

	// The input of a new value takes the focus once the row has taken its predicate and rendered.
	useEffect(() => {
		if (newValueFocus) {
			setNewValueFocus(false);
			_focusNewValueField(rowRef.current);
		}
	}, [newValueFocus]);

	const handleKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
		if (!_isOwnEvent(event)) {
			return;
		}

		if (FormEditorShortcuts.Comment.matches(event) && header?.kind !== 'type' && editor && !editor.isNew) {
			const draft = _commentDraftAt(event.target);

			if (draft !== undefined) {
				event.preventDefault();
				event.stopPropagation();
				setDraftComment(draft);
			}
		} else if (FormEditorShortcuts.Remove.matches(event) && !header && editor && !editor.isNew) {
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
			className={`statement-line is-${rowKind}-row${edited ? ' is-editable' : ''}${editor?.isNew && !header ? ' is-draft' : ''}${_headerClassOf(header)}${folded ? ' is-folded' : ''}${reorder?.dragged ? ' is-dragged' : ''}${reorder?.dropPlacement ? ` is-drop-${reorder.dropPlacement}` : ''}${propertyComment ? ' has-comment' : ''}`}
			role="group"
			aria-label={header ? _headerLabelOf(header) : editor?.isNew ? 'New statement' : label}
			data-predicate={_predicateIriOf(predicateView)}
			tabIndex={edited ? -1 : undefined}
			onKeyDown={edited ? handleKeyDown : undefined}
			onBlur={edited ? handleBlur : undefined}
			onContextMenu={openOnContextMenu}
		>
			{propertyComment && <CommentLine className="statement-property-comment">{propertyComment}</CommentLine>}
			<span className="row-gutter is-start">
				{reorder?.grip && <RowGrip label={label} {...reorder.grip} />}
				{header?.kind === 'type' && _chevron(header)}
			</span>
			<div className="statement-cells">
				{header
					? !folded && _headerPredicateOf(header, edited, label)
					: (
						<span className={`statement-predicate${_isIriLabel(predicateView, label) ? ' is-iri' : ''}`} {...getResourceTooltipAttributes(edited ? undefined : predicateView?.term)}>
							{edited ? <PredicateField editor={edited.editor} state={edited.state} label={label} autoFocus={autoFocus} onPredicateTaken={() => setNewValueFocus(true)} /> : <span className="statement-predicate-text">{label}</span>}
							{wholes.length > 0 && <span className="statement-predicate-count">{wholes.length}</span>}
							<PredicateAnnotations
								annotations={_annotationsOf(literals, edited, namespaces)}
								onOpen={edited ? index => rowRef.current?.querySelector<HTMLElement>(`[data-value-index="${index}"] .literal-field-annotation`)?.click() : undefined}
							/>
						</span>
					)}
				<span className="statement-values">
					{literals.map(entry => <StatementValueCell key={entry.index} {...entry} edited={edited} comment={_commentOf(entry.value, entry.view, entry.index, scope)} scope={scope} {...context} />)}
					{boxed && edited ? _resourceBox(edited, resources, { header: header?.kind, autoFocus: addingValue, label, inferred: inferredResources.map(entry => entry.view), scope }) : !edited || (folded && resources.length === 0) ? _resourcePills(resources, context, scope) : undefined}
					{wholes.map(entry => <StatementValueCell key={entry.index} {...entry} edited={edited} comment={_commentOf(entry.value, entry.view, entry.index, scope)} scope={scope} {...context} />)}
					{inferred.length > 0 && _inferredValuesOf(boxed ? inferred.filter(entry => _kindOf(entry.view) !== 'resource') : inferred, context, scope)}
					{addLink && <button type="button" className="add-link statement-value-add" onClick={() => setAddingValue(true)}>{addLink}</button>}
					{header?.kind === 'type' && header.collapsed && _collapsedSummaryOf(header)}
					{header?.kind === 'type' && header.caption && <span className="nested-card-caption">{header.caption}</span>}
				</span>
				{error && <RowError message={error} onDismiss={state?.rejection ? () => editor?.dismissRejection() : undefined} />}
			</div>
			<span className="row-gutter is-end statement-actions">
				{!header && _rowMenuOf(predicateView, label, cardPins, pinScopes, edited, menuRef)}
			</span>
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
 * @param menuRef Holds the menu element, which a right-click on the row opens as well.
 * @returns The menu, or nothing.
 */
function _rowMenuOf(predicateView: TermData | undefined, label: string, cardPins: PinnedProperties, pinScopes: readonly ScopeKey[], edited: EditedRow | undefined, menuRef: ContextMenu['menuRef']): React.JSX.Element | null {
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
			menuRef={menuRef}
		/>
	);
}

/**
 * The IRI of the predicate of a row, which a pinned field of a collapsed card finds the row by.
 * @param predicateView The predicate, once the row names one.
 * @returns The IRI, or `undefined`.
 */
function _predicateIriOf(predicateView: TermData | undefined): string | undefined {
	return predicateView?.term.termType === 'NamedNode' ? predicateView.term.value : undefined;
}

/**
 * The language tags and datatypes of the literals of a row, which a narrow card shows under the
 * label, as their fields name them.
 * @param literals The literals of the row.
 * @param edited The row, where it is edited.
 * @param namespaces The namespace declarations of the document.
 * @returns The annotations, by the index of their values.
 */
function _annotationsOf(literals: readonly ShownValue[], edited: EditedRow | undefined, namespaces: readonly NamespaceData[]): { index: number; annotation: string }[] {
	const prefixedNameOf: PrefixedNameOf = edited ? datatype => edited.services.resolver.viewOf(datatype).prefixedName : getPrefixedNameIn(namespaces);

	return literals.flatMap(({ view, index }) => {
		const annotation = view.term.termType === 'Literal' ? getLiteralAnnotation(view.term, prefixedNameOf) : undefined;

		return annotation ? [{ index, annotation }] : [];
	});
}

/**
 * Indicate whether a row names its predicate by the IRI, which is then cut at its start, so the
 * local name stays in view.
 * @param predicateView The predicate.
 * @param label The label the row shows.
 * @returns `true` when the label is the IRI.
 */
function _isIriLabel(predicateView: TermData | undefined, label: string): boolean {
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
 * Move the focus into the text of a literal of a row, not of a row nested in it, and put the caret
 * in it.
 * @param row The element of the row.
 * @param index The index of the literal among the values.
 * @param caret Where the caret goes; at the end of the text where absent.
 * @returns Whether the literal was shown and took the focus.
 */
function _focusLiteralField(row: HTMLElement | null, index: number, caret: number | undefined): boolean {
	const input = row?.querySelector<HTMLTextAreaElement>(`:scope > .statement-cells > .statement-values > .statement-value > .literal-field[data-value-index="${index}"] .literal-field-input`);

	if (!input) {
		return false;
	}

	const position = Math.min(caret ?? input.value.length, input.value.length);

	input.focus();
	input.setSelectionRange(position, position);

	return true;
}

/**
 * Move the focus to the field of a new value of a row, not of a row nested in it, where the row
 * has one.
 * @param row The element of the row.
 */
function _focusNewValueField(row: HTMLElement | null): void {
	row?.querySelector<HTMLElement>(':scope > .statement-cells > .statement-values > .statement-value.is-adder .input-field')?.focus();
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
 * shows while the focus is in the row, or at once where Add value opened it. It offers the terms
 * of the workspace, the type of a blank node its classes, and asks to choose one while there is
 * none. `[` typed into the empty input starts a new blank node where a new value starts as a
 * resource. A row for a new statement takes no value until its predicate is picked, and its input
 * asks for that.
 * @param edited The row.
 * @param resources The resources of the row.
 * @param options The kind of header the row is, whether the input takes the focus, the label
 * of the predicate, which the input of an empty row asks to add a value for, the resources the
 * reasoner infers, which stand after the others, and where the comments of the values are written.
 * @returns The box.
 */
function _resourceBox(edited: EditedRow, resources: readonly ShownValue[], options: { header?: RowHeader['kind']; autoFocus: boolean; label: string; inferred: readonly TermData[]; scope: CommentScope }): React.JSX.Element {
	const { header, autoFocus, label, inferred, scope } = options;
	const isType = header === 'type';
	const { editor, state, defaultType } = edited;
	const awaitsPredicate = editor.isNew && state.draft.predicate === undefined;
	// The input Add value opens shows at once: hidden until the row has the focus, it could not take it.
	const onIntent = !autoFocus && resources.length === 0 && state.draft.values.length > 0 && state.pendingText === '';
	const classes = ['statement-value', 'is-adder', ...(resources.length === 0 ? ['is-after-values'] : []), ...(onIntent ? ['is-on-intent'] : [])];

	return (
		<span className={classes.join(' ')}>
			<ResourceValues
				resources={resources.map(({ value, view, index }) => ({ view, index, comment: _commentOf(value, view, index, scope) }))}
				inferred={inferred}
				targetType={_targetTypeOf(isType, defaultType)}
				statement={isType ? undefined : { subject: editor.subject, predicate: state.draft.predicate }}
				pendingText={state.pendingText}
				placeholder={awaitsPredicate ? 'Pick a property first' : _placeholderOf(state.draft.values.length, header, label)}
				readOnly={awaitsPredicate}
				onPendingInput={(text, caret) => _inputPending(edited, text, caret)}
				onPick={option => editor.pickValue(option)}
				onCreate={() => editor.commitPending()}
				onRemove={index => editor.removeValue(index)}
				onMove={(from, to) => editor.moveValue(from, to)}
				onStartNode={!header && defaultType.type === 'resource' ? () => editor.addNode() : undefined}
				onStartText={isType ? undefined : () => edited.focusValue(editor.startLiteral(''))}
				newValueType={isType ? undefined : { languages: edited.services.languages, onPick: selection => _pickNewValueType(edited, selection) }}
				autoFocus={autoFocus}
			/>
		</span>
	);
}

/**
 * Take the text typed for a new value: where a new value starts as a literal, the text goes into a
 * literal of its own, with the datatype a range names, which takes the focus with the caret where
 * it was; text for a resource stays in the input.
 * @param edited The row.
 * @param text The text.
 * @param caret Where the caret stands in the text.
 */
function _inputPending(edited: EditedRow, text: string, caret: number): void {
	if (startsLiteral(text, edited.defaultType)) {
		edited.focusValue(edited.editor.startLiteral(text, getDefaultAnnotation(edited.defaultType)), caret);
	} else {
		edited.editor.inputPending(text);
	}
}

/**
 * Give the text typed for a new value what was picked for it from the annotation picker of its
 * type: a datatype or a language makes a literal of it, which takes the focus; resource keeps it in
 * the input, as it is.
 * @param edited The row.
 * @param selection What the item picked gives the text.
 */
function _pickNewValueType(edited: EditedRow, selection: LiteralAnnotationPickerSelection): void {
	if (selection.type === 'literal') {
		edited.focusValue(edited.editor.startLiteral(edited.state.pendingText.trim(), selection.annotation, selection.missingPrefix));
	}
}

/**
 * The type of terms the input of the next value of a row offers: classes for the type of a
 * resource, resources where a new value starts as a resource, none where it starts as text.
 * @param isType Whether the row is the type of a resource.
 * @param defaultType The type a new value starts as.
 * @returns The type of terms, or `undefined` for none.
 */
function _targetTypeOf(isType: boolean, defaultType: DefaultValueType): TermSearchTargetType | undefined {
	if (isType) {
		return 'class';
	}

	return defaultType.type === 'resource' ? 'resource' : undefined;
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
 * The resources of a row that only reads, as pills that lead to them; a pill with a comment takes a
 * line of its own, under its comment.
 * @param resources The resources of the row.
 * @param context Where the row stands.
 * @param scope Where the comments of the values are written.
 * @returns The pills, or nothing for a row without resources.
 */
function _resourcePills(resources: readonly ShownValue[], context: StatementRowContext, scope: CommentScope): React.JSX.Element | null {
	if (resources.length === 0) {
		return null;
	}

	return (
		<span className="statement-value">
			<span className="value-pills">
				{resources.map(({ value, view, index }) => {
					const comment = _commentOf(value, view, index, scope);
					const pill = <TermValue key={index} view={view} {...context} />;

					// A pill with a comment takes a line of its own, under its comment.
					return comment ? <span key={index} className="value-pill-line">{comment}{pill}</span> : pill;
				})}
			</span>
		</span>
	);
}

/**
 * The comment written above a value of a row, where it has one, edited in place where the value is
 * written in the document; once asked for, an empty field above a value without a comment, which
 * writes one.
 * @param value The value.
 * @param view The view of the value.
 * @param index The index of the value among the values of the row.
 * @param scope Where the comment is written.
 * @returns The comment, or `undefined` for a value without one.
 */
function _commentOf(value: RowValue, view: TermData, index: number, scope: CommentScope): ReactNode {
	const { subject, card, predicate, version, draft, onDraftDone } = scope;
	const anchor = predicate !== undefined && view.anchor !== undefined ? { kind: 'value' as const, subject, predicate, anchor: view.anchor } : undefined;
	const asked = draft === index && anchor !== undefined;

	if (value.kind !== 'written' || (!view.comments && !asked)) {
		return undefined;
	}

	return (
		<CommentField
			className="statement-comment statement-value-comment"
			label="Comment on the value"
			lines={view.comments ?? []}
			target={anchor ? getCommentTarget(anchor) : undefined}
			subject={subject}
			card={card}
			version={version}
			autoFocus={asked}
			onLeave={asked ? onDraftDone : undefined}
		/>
	);
}

/**
 * The comment written above the property of a row, where it has one, shown above the row and
 * edited in place; once asked for, an empty field for a property without a comment, which
 * writes one.
 * @param property The property.
 * @param scope Where the comment is written.
 * @returns The comment, or `undefined` for a property without one.
 */
function _propertyCommentOf(property: PredicateData, scope: CommentScope): ReactNode {
	const { subject, card, version, draft, onDraftDone } = scope;
	const predicate = property.predicate.term;
	const anchor = predicate.termType === 'NamedNode' ? { kind: 'property' as const, subject, predicate: predicate.value } : undefined;
	const asked = draft === 'property' && anchor !== undefined;

	if (!property.comments && !asked) {
		return undefined;
	}

	return (
		<CommentField
			className="statement-comment"
			label="Comment on the property"
			lines={property.comments ?? []}
			target={anchor ? getCommentTarget(anchor) : undefined}
			subject={subject}
			card={card}
			version={version}
			autoFocus={asked}
			onLeave={asked ? onDraftDone : undefined}
		/>
	);
}

/**
 * The comment Ctrl+/ asks for where the focus is in a row: the one above the value whose field or
 * pill has the focus, else the one above the property, from its predicate or the input of a new
 * value. Nothing in a comment, which is one already.
 * @param target The element the key was pressed in.
 * @returns The comment, or `undefined` where there is none to ask for.
 */
function _commentDraftAt(target: EventTarget): CommentDraft | undefined {
	if (!(target instanceof Element) || target.closest('.comment-field')) {
		return undefined;
	}

	const value = target.closest('[data-value-index]')?.getAttribute('data-value-index');

	return value !== null && value !== undefined ? Number(value) : 'property';
}

/**
 * The values the reasoner infers for the predicate of an edited row, after those it edits, as a
 * row that only reads shows them: literals on lines of their own, resources as pills, and blank
 * nodes and lists whole. The pills are not links, as the pills of the values the row edits are not.
 * @param inferred The values.
 * @param context Where the row stands.
 * @param scope Where the comments of the values are written.
 * @returns The values.
 */
function _inferredValuesOf(inferred: readonly ShownValue[], context: StatementRowContext, scope: CommentScope): React.JSX.Element {
	const cellOf = (entry: ShownValue): React.JSX.Element => <StatementValueCell key={entry.index} {...entry} comment={_commentOf(entry.value, entry.view, entry.index, scope)} scope={scope} {...context} />;
	const resources = inferred.filter(entry => _kindOf(entry.view) === 'resource');

	return (
		<span className="statement-inferred-values">
			{inferred.filter(entry => _kindOf(entry.view) === 'literal').map(cellOf)}
			{resources.length > 0 && (
				<span className="statement-value">
					<span className="value-pills">
						{resources.map(({ view, index }) => <ValuePill key={index} view={view} />)}
					</span>
				</span>
			)}
			{inferred.filter(entry => _kindOf(entry.view) === 'whole').map(cellOf)}
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
function _kindOf(view: TermData): 'literal' | 'resource' | 'whole' {
	if (view.collection || view.term.termType === 'BlankNode') {
		return 'whole';
	}

	return view.term.termType === 'Literal' ? 'literal' : 'resource';
}

/**
 * The view of the predicate an edited row names, once it names one, with the label of the option
 * it was picked from where the document does not describe it.
 * @param editor Edits the row, and keeps the label of a picked predicate.
 * @param state The state of the row.
 * @param services Gives the predicate its label.
 * @returns The view, or `undefined` while the row names no predicate.
 */
function _editedPredicateView(editor: StatementRowEditor, state: StatementRowState, services: StatementServices): TermData | undefined {
	if (!state.draft.predicate) {
		return undefined;
	}

	const view = services.resolver.viewOf(RdfDataFactory.namedNode(state.draft.predicate));

	return view.label ? view : { ...view, label: editor.labelOfPicked(state.draft.predicate) };
}
