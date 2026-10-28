import { FocusEvent, KeyboardEvent, RefObject, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ValueKind } from '@src/utilities/value-kind';
import { InputFieldElement } from '../input/input-field-element';
import { InputFieldId } from '../input/input-field-id';
import { InputFieldKeyAction } from '../input/input-field-key-action';
import { InputFieldInputKind, InputFieldKeyContext } from '../input/input-field-key-context';
import { InputFieldKeyResolver } from '../input/input-field-key-resolver';
import { IStatementTextService } from '../services/statement-text-service.interface';
import { EditableStatement } from '../state/editable-statement';
import { EditableValue } from '../state/editable-value';
import { StatementEditorState } from '../state/statement-editor-state';

/**
 * The column of a row the caret moves to when it leaves another row vertically.
 */
export type StatementRowColumn = 'predicate' | 'value';

/**
 * What the editor of a statement row works on and tells its list.
 */
export interface StatementEditorOptions {
	/**
	 * The statement as stored, which the fields start from.
	 */
	initial: EditableStatement;

	/**
	 * Turns the fields into text and back.
	 */
	service: IStatementTextService;

	/**
	 * Called when the row is left with a statement other than the one it started from, or the
	 * one it last committed.
	 */
	onCommit: (statement: EditableStatement) => void;

	/**
	 * Called when the statement of the row is to go.
	 */
	onDeleteRow: () => void;

	/**
	 * Called when the caret leaves the row upward or downward.
	 */
	onLeaveRow: (direction: 'previous' | 'next', column: StatementRowColumn) => void;
}

/**
 * The attributes that wire a field element to its row.
 */
export interface InputFieldBinding {
	/**
	 * Registers the element of the field.
	 */
	ref: (element: HTMLElement | null) => void;

	/**
	 * The identifier of the field, by which it is found.
	 */
	'data-field': string;

	/**
	 * Tells the row that the field took the focus.
	 */
	onFocus: () => void;

	/**
	 * Hands a key of the field to the row.
	 */
	onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
}

/**
 * The state of a statement row and the handlers its elements are wired with.
 */
export interface StatementEditorHandle {
	/**
	 * The state of the fields.
	 */
	state: StatementEditorState;

	/**
	 * What the predicate of the row takes.
	 */
	range: ValueKind;

	/**
	 * The element of the row, which holds the fields.
	 */
	containerRef: RefObject<HTMLDivElement | null>;

	/**
	 * Wire a field element to the row.
	 * @param field The field.
	 * @returns The attributes of the element.
	 */
	bind(field: InputFieldId): InputFieldBinding;

	/**
	 * Replace the predicate as typed.
	 * @param text The text.
	 */
	setPredicate(text: string): void;

	/**
	 * Replace the text typed into the field for a new value.
	 * @param text The text.
	 */
	setPending(text: string): void;

	/**
	 * Replace a value as typed.
	 * @param index The index of the value.
	 * @param value The value.
	 */
	setValue(index: number, value: EditableValue): void;

	/**
	 * Move the caret to the field for a new value.
	 */
	focusNewValue(): void;

	/**
	 * Note that the row or a field of it took the focus.
	 * @param event The focus event.
	 */
	onContainerFocus(event: FocusEvent<HTMLElement>): void;

	/**
	 * Note that a field of the row lost the focus, which commits the row once the focus settled
	 * outside it.
	 */
	onContainerBlur(): void;
}

const resolver = new InputFieldKeyResolver();

/**
 * Hold the fields of a statement row: the predicate, one field per value and the field for a new
 * value. The fields start from the stored statement and start over when it changes while the row
 * is idle. Leaving the row commits what changed.
 * @param options The row.
 * @returns The state and the handlers.
 */
export function useStatementEditor(options: StatementEditorOptions): StatementEditorHandle {
	const { initial, service } = options;
	const [state, setState] = useState(() => StatementEditorState.of(initial));
	const containerRef = useRef<HTMLDivElement>(null);
	const fields = useInputFieldElements();
	const initialText = service.canonicalTextOf(initial);
	const latest = useRef({ options, state });
	const lastCommitted = useRef(initialText);
	const active = useRef(false);
	const deleted = useRef(false);

	latest.current = { options, state };

	// The stored statement changed, as after an edit or an undo: the fields start over, unless the
	// user typed something since the statement the row last stored, which is kept for them.
	useEffect(() => {
		const { state: current, options: { service: currentService } } = latest.current;
		const typed = active.current && currentService.canonicalTextOf(_committedStatementOf(current, currentService)) !== lastCommitted.current;

		lastCommitted.current = initialText;
		deleted.current = false;

		if (!typed) {
			setState(StatementEditorState.of(latest.current.options.initial));
		}
		// Only when the stored statement changes.
	}, [initialText]);

	// The field a transition asks for takes the caret once it is drawn.
	useLayoutEffect(() => {
		const request = state.focusRequest;
		const element = request ? fields.elementOf(request.field) : undefined;

		if (request && element) {
			new InputFieldElement(element).focus(request.caret);
			setState(current => current.focusFulfilled());
		}
	}, [state, fields]);

	const commitNow = useCallback((): void => {
		const { state: current, options: { service: currentService, onCommit } } = latest.current;
		const statement = _committedStatementOf(current, currentService);
		const text = currentService.canonicalTextOf(statement);

		if (!deleted.current && text !== lastCommitted.current) {
			lastCommitted.current = text;
			onCommit(statement);
		}
	}, []);

	const leave = useCallback((): void => {
		active.current = false;
		commitNow();
		setState(current => current.left(_typedValueOf(current, latest.current.options.service)));
	}, [commitNow]);

	const onFieldKeyDown = useCallback((field: InputFieldId, event: KeyboardEvent<HTMLElement>): void => {
		const { state: current, options: currentOptions } = latest.current;
		const key = { key: event.key, ctrlKey: event.ctrlKey, metaKey: event.metaKey, altKey: event.altKey, shiftKey: event.shiftKey, isComposing: event.nativeEvent.isComposing };
		const action = resolver.resolve(key, _keyContextOf(field, event.currentTarget, current, currentOptions.service));

		if (!action) {
			return;
		}

		event.preventDefault();

		const next = _fieldActionState(action, field, current, currentOptions.service);

		if (next) {
			setState(next);
		} else {
			_performRowAction(action, field, { commitNow, options: currentOptions, lastCommitted, deleted, setState });
		}
	}, [commitNow]);

	const bind = useCallback((field: InputFieldId): InputFieldBinding => ({
		ref: fields.register(field),
		'data-field': field.toString(),
		onFocus: () => setState(current => current.fieldFocused(field)),
		onKeyDown: event => onFieldKeyDown(field, event)
	}), [fields, onFieldKeyDown]);

	const onContainerFocus = useCallback((event: FocusEvent<HTMLElement>): void => {
		active.current = true;

		// The row itself took the focus, as by a request after an edit: the caret goes to the
		// predicate of an empty row, else to the end of the row.
		if (event.target === event.currentTarget) {
			setState(current => current.statement.predicate.trim() === '' ? current.focusing(InputFieldId.PREDICATE, 'end') : current.movedToRowEnd());
		}
	}, []);

	const onContainerBlur = useCallback((): void => {
		// Wait for the focus to settle: it may only be moving to another field of the row, or to a
		// field a state change is about to draw.
		window.setTimeout(() => {
			if (active.current && !containerRef.current?.contains(document.activeElement)) {
				leave();
			}
		}, 0);
	}, [leave]);

	return {
		state,
		range: service.rangeOf(state.statement.predicate),
		containerRef,
		bind,
		setPredicate: text => setState(current => current.withStatement(current.statement.withPredicate(text))),
		setPending: text => setState(current => current.withPending(text)),
		setValue: (index, value) => setState(current => current.withStatement(current.statement.withValue(index, value))),
		focusNewValue: () => setState(current => current.focusing(InputFieldId.NEW_VALUE, 'end')),
		onContainerFocus,
		onContainerBlur
	};
}

/**
 * The elements of the fields of a row by name, so the focus can be moved to a field that a state
 * change is about to draw, such as the pill a typed resource becomes.
 */
interface InputFieldElements {
	/**
	 * Register the element of a field; pass the result as the `ref` of the element.
	 * @param field The field.
	 * @returns The ref callback, the same one for the same field.
	 */
	register(field: InputFieldId): (element: HTMLElement | null) => void;

	/**
	 * Get the element of a field.
	 * @param field The field.
	 * @returns The element, or `undefined` while the field is not drawn.
	 */
	elementOf(field: InputFieldId): HTMLElement | undefined;
}

/**
 * Keep the elements of the fields of a row by name.
 * @returns The registry.
 */
function useInputFieldElements(): InputFieldElements {
	const elements = useRef(new Map<string, HTMLElement>());
	const registrations = useRef(new Map<string, (element: HTMLElement | null) => void>());

	return useMemo(() => ({
		register: field => {
			const key = field.toString();
			let registration = registrations.current.get(key);

			if (!registration) {
				registration = element => {
					if (element) {
						elements.current.set(key, element);
					} else {
						elements.current.delete(key);
					}
				};
				registrations.current.set(key, registration);
			}

			return registration;
		},
		elementOf: field => elements.current.get(field.toString())
	}), []);
}

/**
 * What the actions on the row as a whole reach.
 */
interface RowActionControl {
	/**
	 * Commits the row now.
	 */
	commitNow(): void;

	/**
	 * The row.
	 */
	options: StatementEditorOptions;

	/**
	 * The text the row last committed.
	 */
	lastCommitted: { current: string };

	/**
	 * Whether the row was deleted, so leaving it commits nothing.
	 */
	deleted: { current: boolean };

	/**
	 * Replaces the state.
	 */
	setState(state: StatementEditorState): void;
}

/**
 * Carry out an action on the row as a whole: leave it, delete it or give up what was typed.
 * @param action The action.
 * @param field The field the key was pressed in.
 * @param control The row.
 */
function _performRowAction(action: InputFieldKeyAction, field: InputFieldId, control: RowActionControl): void {
	const { options } = control;

	switch (action.kind) {
		case 'nextRow':
			control.commitNow();
			options.onLeaveRow('next', 'predicate');
			break;
		case 'rowUp':
		case 'rowDown':
			options.onLeaveRow(action.kind === 'rowUp' ? 'previous' : 'next', field.kind === 'predicate' ? 'predicate' : 'value');
			break;
		case 'deleteRow':
			control.deleted.current = true;
			options.onDeleteRow();
			break;
		case 'restore':
			control.lastCommitted.current = options.service.canonicalTextOf(options.initial);
			control.setState(StatementEditorState.of(options.initial).fieldFocused(field));
			break;
		default:
			break;
	}
}

/**
 * The state an action on a field leads to.
 * @param action The action.
 * @param field The field the key was pressed in.
 * @param state The state.
 * @param service Reads typed text.
 * @returns The next state, or `undefined` for an action on the row as a whole.
 */
function _fieldActionState(action: InputFieldKeyAction, field: InputFieldId, state: StatementEditorState, service: IStatementTextService): StatementEditorState | undefined {
	switch (action.kind) {
		case 'previousField':
		case 'nextField':
			return state.movedToNeighbour(field, action.kind === 'nextField' ? 'next' : 'previous');
		case 'commitField':
			return field.kind === 'newValue' ? state.typedValueCommitted(_typedValueOf(state, service)) : state.pillConfirmed();
		case 'removeField':
			return field.index === undefined ? state : state.valueRemoved(field.index, action.forward === true);
		case 'addValue':
			return state.focusing(InputFieldId.NEW_VALUE, 'end');
		case 'removePrevious':
			return state.previousValueRemoved();
		case 'startSuffix':
			return _suffixStartedState(field, action.marker, state, service);
		case 'removeSuffix':
			return field.index === undefined ? state : state.suffixRemoved(field.index);
		case 'startLiteral':
			return state.literalStarted();
		case 'rowStart':
			return state.focusing(InputFieldId.PREDICATE, 'start');
		case 'rowEnd':
			return state.movedToRowEnd();
		case 'editPill':
			return field.index === undefined ? state : state.pillEdited(field.index, action.seed);
		default:
			return undefined;
	}
}

/**
 * Start the tag of a literal: of the literal typed into, or of the text typed for a new value,
 * which becomes a literal.
 * @param field The field the marker was typed in.
 * @param marker The marker of the tag.
 * @param state The state.
 * @param service Reads typed text.
 * @returns The next state.
 */
function _suffixStartedState(field: InputFieldId, marker: '@' | '^^', state: StatementEditorState, service: IStatementTextService): StatementEditorState {
	if (field.kind === 'newValue') {
		const typed = service.valueOfTypedText(state.pending, 'literal');

		return state.literalAppended(typed?.kind === 'literal' ? typed.value : state.pending, marker);
	}

	return field.index === undefined ? state : state.suffixStarted(field.index, marker);
}

/**
 * The statement the row commits: with the text typed for a new value taken as a value.
 * @param state The state.
 * @param service Reads typed text.
 * @returns The statement.
 */
function _committedStatementOf(state: StatementEditorState, service: IStatementTextService): EditableStatement {
	return state.pendingFolded(_typedValueOf(state, service)).statement;
}

/**
 * Read the text typed for a new value against what the predicate takes.
 * @param state The state.
 * @param service Reads typed text.
 * @returns The value, or `undefined` when nothing was typed.
 */
function _typedValueOf(state: StatementEditorState, service: IStatementTextService): EditableValue | undefined {
	return service.valueOfTypedText(state.pending, service.rangeOf(state.statement.predicate));
}

/**
 * Describe the field that received a key for the key resolver.
 * @param field The field.
 * @param element The element of the field.
 * @param state The state.
 * @param service Tells whether typed text reads as a name.
 * @returns The context.
 */
function _keyContextOf(field: InputFieldId, element: HTMLElement, state: StatementEditorState, service: IStatementTextService): InputFieldKeyContext {
	const input = new InputFieldElement(element);
	const kind = _inputKindOf(field, state);
	const text = input.value;
	const { start, end } = input.selection;
	const collapsed = start === end;
	const value = field.index === undefined ? undefined : state.statement.values[field.index];

	return {
		field: kind,
		empty: kind !== 'resourcePill' && text.length === 0,
		atStart: collapsed && start === 0,
		atEnd: collapsed && start === text.length,
		onFirstLine: !text.slice(0, start).includes('\n'),
		onLastLine: !text.slice(end).includes('\n'),
		rowEmpty: state.rowEmpty,
		looksLikeName: kind === 'newValue' && service.valueOfTypedText(text, 'any')?.kind === 'resource',
		previousCharacter: collapsed && start > 0 ? text[start - 1] : undefined,
		hasSuffix: value?.kind === 'literal' && value.suffix !== ''
	};
}

/**
 * The kind of input a field is, for the key resolver.
 * @param field The field.
 * @param state The state.
 * @returns The kind.
 */
function _inputKindOf(field: InputFieldId, state: StatementEditorState): InputFieldInputKind {
	switch (field.kind) {
		case 'predicate':
			return 'predicate';
		case 'newValue':
			return 'newValue';
		case 'tag':
			return 'literalTag';
		default: {
			const value = state.statement.values[field.index ?? -1];

			if (value?.kind === 'resource') {
				return state.editingPill === field.index ? 'resourceText' : 'resourcePill';
			}

			return value?.kind === 'literal' ? 'literalText' : 'source';
		}
	}
}
