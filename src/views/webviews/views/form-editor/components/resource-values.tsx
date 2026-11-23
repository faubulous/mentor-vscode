import { DragEvent, FocusEvent, KeyboardEvent, MouseEvent, useEffect, useMemo, useRef, useState } from 'react';
import { VscodeTextfield } from '@vscode-elements/elements';
import { ResourceOptionData, TermData, TermSearchStatement, TermSearchTargetType } from '../form-editor-model';
import { NewValueTypeMarker } from './new-value-type-marker';
import { LiteralAnnotationPickerSelection } from './literal-annotation-picker-items';
import { TermPicker } from './term-picker';
import { ValuePill } from './value-pill';

/**
 * A resource value of a row, with its index among the values of the statement.
 */
interface ResourceValueEntry {
	/**
	 * The view of the resource.
	 */
	view: TermData;

	/**
	 * The index of the value among the values of the statement.
	 */
	index: number;
}

/**
 * The state of a pill being dragged, from the start of the drag to the drop: which pill it is and
 * where it would drop.
 */
interface PillDragState {
	/**
	 * The place of the pill among the pills.
	 */
	position: number;

	/**
	 * The gap among the pills it would be dropped into, counted from the gap before the first pill.
	 */
	slot?: number;
}

/**
 * The annotation picker of the text typed for a new value, which the input shows after the text,
 * and what to do when a datatype or language is picked for it.
 */
interface NewValueTypeControl {
	/**
	 * The languages of the card, which the annotation picker offers first.
	 */
	languages: readonly string[];

	/**
	 * Called with what the item picked gives the typed text.
	 */
	onPick: (selection: LiteralAnnotationPickerSelection) => void;
}

/**
 * Properties of the {@link ResourceValues} component.
 */
export interface ResourceValuesProps {
	/**
	 * The resources of the row, in order.
	 */
	resources: readonly ResourceValueEntry[];

	/**
	 * The type of terms the input offers, such as classes for the type of a resource; none where it
	 * takes text only.
	 */
	targetType?: TermSearchTargetType;

	/**
	 * The statement the input picks values for, whose fitting terms it offers first.
	 */
	statement?: TermSearchStatement;

	/**
	 * The text typed into the input.
	 */
	pendingText: string;

	/**
	 * The hint shown in the empty input.
	 */
	placeholder: string;

	/**
	 * Called with the text of the input as it is typed, and where the caret stands in it.
	 */
	onPendingInput: (text: string, caret: number) => void;

	/**
	 * Called with a term picked from the list.
	 */
	onPick: (option: ResourceOptionData) => void;

	/**
	 * Called when Enter takes the typed text.
	 */
	onCreate: () => void;

	/**
	 * Called to remove a value.
	 */
	onRemove: (index: number) => void;

	/**
	 * Called to move a value to another place among the values; absent where the values cannot be
	 * moved.
	 * @param from The index of the value.
	 * @param to The index the value has afterwards.
	 */
	onMove?: (from: number, to: number) => void;

	/**
	 * Called when `[` is typed into the empty input, to start a new blank node; absent where the
	 * input takes no blank node.
	 */
	onStartNode?: () => void;

	/**
	 * Called when `"` is typed into the empty input, to start a literal; absent where the input
	 * takes no literal.
	 */
	onStartText?: () => void;

	/**
	 * The type of value the input makes, shown after its text while it has the focus and text;
	 * absent where the input makes only resources of one class, as the types of a resource.
	 */
	newValueType?: NewValueTypeControl;

	/**
	 * Whether the input takes the focus when it appears.
	 */
	autoFocus?: boolean;

	/**
	 * Whether the input takes no value yet, as in a row whose predicate is not picked.
	 */
	readOnly?: boolean;
}

/**
 * The resources of a statement in one box: a pill per resource and the input of the next value
 * after the last pill, which offers the terms of the workspace that are not among the values yet,
 * as a {@link TermPicker}, and takes a typed prefixed name, `<iri>` or, where the predicate takes
 * more than resources, text. The box is one stop of Tab, the
 * input; the arrows walk the pills from it. On a pill Backspace and Delete remove it, Alt with an
 * arrow moves it one place, and typing continues in the input. Where the values can be moved, a
 * pill is dragged to another place among the pills, an accent bar showing where it is dropped.
 * Moving changes the order of the values only. Once text is typed into the input, the type of
 * value it makes stands after the text, and opens the annotation picker; `"` in the empty input starts
 * text.
 * @param props The resources and their callbacks.
 * @returns The box.
 */
export function ResourceValues(props: ResourceValuesProps): React.JSX.Element {
	const { resources, targetType, statement, pendingText, placeholder, onPendingInput, onPick, onCreate, onRemove, onMove, onStartNode, onStartText, newValueType, autoFocus = false, readOnly = false } = props;
	const pills = useRef<(HTMLElement | null)[]>([]);
	const fieldRef = useRef<VscodeTextfield>(null);
	const [focusRequest, setFocusRequest] = useState<number>();
	const [drag, setDrag] = useState<PillDragState>();
	const [focused, setFocused] = useState(false);
	const present = useMemo(() => _presentOf(resources), [resources]);

	// The input takes the focus once it has rendered the field it hands the focus to.
	useEffect(() => {
		const field = fieldRef.current;

		if (autoFocus && field) {
			void field.updateComplete.then(() => field.focus());
		}
	}, [autoFocus]);

	const focusPill = (position: number): void => {
		if (position >= resources.length) {
			fieldRef.current?.focus();
		} else if (position >= 0) {
			pills.current[position]?.focus();
		}
	};

	// A moved pill is rendered anew at its place, where it takes the focus back.
	useEffect(() => {
		if (focusRequest !== undefined) {
			pills.current[focusRequest]?.focus();
			setFocusRequest(undefined);
		}
	}, [focusRequest, resources]);

	const movePill = (position: number, slot: number): void => {
		const move = _moveOf(resources, position, slot);

		if (onMove && move) {
			onMove(move.from, move.to);
			setFocusRequest(slot > position ? slot - 1 : slot);
		}
	};

	const handlePillKeyDown = (position: number) => (event: KeyboardEvent<HTMLSpanElement>): void => {
		const step = onMove ? _moveStepOf(event) : 0;

		if (step !== 0) {
			event.preventDefault();
			movePill(position, step < 0 ? position - 1 : position + 2);

			return;
		}

		switch (event.key) {
			case 'ArrowLeft':
				event.preventDefault();
				focusPill(Math.max(0, position - 1));
				return;
			case 'ArrowRight':
				event.preventDefault();
				focusPill(position + 1);
				return;
			case 'Home':
				event.preventDefault();
				focusPill(0);
				return;
			case 'End':
				event.preventDefault();
				focusPill(resources.length);
				return;
			case 'Backspace':
			case 'Delete':
				event.preventDefault();
				onRemove(resources[position].index);
				focusPill(event.key === 'Backspace' ? position - 1 : position);
				return;
			default:
				if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
					event.preventDefault();
					onPendingInput(pendingText + event.key, pendingText.length + 1);
					fieldRef.current?.focus();
				}
		}
	};

	const handleFieldKeyDown = (event: KeyboardEvent<VscodeTextfield>): void => {
		if (onStartNode && !readOnly && event.key === '[' && pendingText === '') {
			event.preventDefault();
			onStartNode();

			return;
		}

		if (onStartText && !readOnly && event.key === '"' && pendingText === '') {
			event.preventDefault();
			onStartText();

			return;
		}

		const input = event.currentTarget.wrappedElement;
		const atStart = input ? input.selectionStart === 0 && input.selectionEnd === 0 : pendingText === '';

		if (resources.length > 0 && atStart && (event.key === 'ArrowLeft' || event.key === 'Backspace')) {
			event.preventDefault();

			if (event.key === 'Backspace') {
				onRemove(resources[resources.length - 1].index);
			} else {
				focusPill(resources.length - 1);
			}
		}
	};

	// The type shows while the input has the focus, or the annotation picker the type opened.
	const trackFocus = (event: FocusEvent<HTMLSpanElement>): void => {
		const target = event.target as Element;

		setFocused(target === fieldRef.current || target.closest('.combobox-suffix') !== null);
	};

	const loseFocus = (event: FocusEvent<HTMLSpanElement>): void => {
		if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) {
			setFocused(false);
		}
	};

	const focusFieldOnFreeSpace = (event: MouseEvent<HTMLSpanElement>): void => {
		if (event.target === event.currentTarget) {
			event.preventDefault();
			fieldRef.current?.focus();
		}
	};

	const dragHandlersOf = (position: number) => onMove ? {
		draggable: true,
		onDragStart: (event: DragEvent<HTMLSpanElement>): void => {
			event.dataTransfer.effectAllowed = 'move';
			event.dataTransfer.setData('text/plain', resources[position].view.term.value);
			setDrag({ position });
		},
		onDragOver: (event: DragEvent<HTMLSpanElement>): void => {
			if (!drag) {
				return;
			}

			const bounds = event.currentTarget.getBoundingClientRect();
			const slot = event.clientX > bounds.left + bounds.width / 2 ? position + 1 : position;

			event.preventDefault();
			event.dataTransfer.dropEffect = 'move';

			if (slot !== drag.slot) {
				setDrag({ ...drag, slot });
			}
		},
		onDrop: (event: DragEvent<HTMLSpanElement>): void => {
			if (drag?.slot !== undefined) {
				event.preventDefault();
				movePill(drag.position, drag.slot);
			}

			setDrag(undefined);
		},
		onDragEnd: (): void => setDrag(undefined)
	} : {};

	return (
		<span className="resource-values" onMouseDown={focusFieldOnFreeSpace} onFocus={trackFocus} onBlur={loseFocus}>
			{resources.map(({ view, index }, position) => (
				<span key={index} data-value-index={index} className={_dropClassOf(drag, position, resources.length)} {...dragHandlersOf(position)}>
					<ValuePill view={view} pillRef={element => { pills.current[position] = element; }} onKeyDown={handlePillKeyDown(position)} onRemove={() => onRemove(index)} />
				</span>
			))}
			<TermPicker
				targetType={targetType}
				statement={statement}
				exclude={present}
				text={pendingText}
				onTextChange={text => onPendingInput(text, fieldRef.current?.wrappedElement?.selectionStart ?? text.length)}
				onPick={onPick}
				onCreate={onCreate}
				onKeyDown={handleFieldKeyDown}
				label="New value"
				placeholder={placeholder}
				readOnly={readOnly}
				className="is-new"
				fieldRef={fieldRef}
				suffix={newValueType && focused && !readOnly && pendingText !== '' ? <NewValueTypeMarker {...newValueType} onDone={() => _focusAtEnd(fieldRef.current)} /> : undefined}
			/>
		</span>
	);
}

/**
 * The IRIs among the values, which the input does not offer again.
 * @param resources The resources of the row.
 * @returns The IRIs.
 */
function _presentOf(resources: readonly ResourceValueEntry[]): Set<string> {
	return new Set(resources.flatMap(({ view }) => view.term.termType === 'NamedNode' ? [view.term.value] : []));
}

/**
 * The move of a pill into a gap among the pills, as indexes among all the values of the statement,
 * which literals may share with the resources.
 * @param resources The resources of the row, in order.
 * @param position The place of the pill among the pills.
 * @param slot The gap it goes into, counted from the gap before the first pill.
 * @returns The index of the value and the index it has afterwards, or `undefined` where the pill
 * stays where it is.
 */
function _moveOf(resources: readonly ResourceValueEntry[], position: number, slot: number): { from: number; to: number } | undefined {
	if (slot < 0 || slot > resources.length || slot === position || slot === position + 1) {
		return undefined;
	}

	const from = resources[position].index;
	const target = slot < resources.length ? resources[slot].index : resources[resources.length - 1].index + 1;

	return { from, to: target > from ? target - 1 : target };
}

/**
 * The direction a key moves a pill in: Alt with the left or up arrow moves it back, Alt with the
 * right or down arrow forward.
 * @param event The key event.
 * @returns -1 back, 1 forward, 0 for any other key.
 */
function _moveStepOf(event: KeyboardEvent<HTMLElement>): number {
	if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
		return 0;
	}

	if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
		return -1;
	}

	return event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : 0;
}

/**
 * The class that shows where a dragged pill would be dropped: an accent bar before the pill at the
 * gap, or after the last pill. No bar shows where the drop would leave the pill where it is.
 * @param drag The pill being dragged, if any.
 * @param position The place of a pill among the pills.
 * @param count The number of pills.
 * @returns The class, or `undefined`.
 */
function _dropClassOf(drag: PillDragState | undefined, position: number, count: number): string | undefined {
	if (!drag || drag.slot === undefined || drag.slot === drag.position || drag.slot === drag.position + 1) {
		return undefined;
	}

	if (drag.slot === position) {
		return 'is-drop-before';
	}

	return drag.slot === count && position === count - 1 ? 'is-drop-after' : undefined;
}

/**
 * Move the focus into a field with the caret after its text, as typing goes on where it stopped.
 * @param field The field.
 */
function _focusAtEnd(field: VscodeTextfield | null): void {
	field?.focus();

	const input = field?.wrappedElement;

	input?.setSelectionRange(input.value.length, input.value.length);
}
