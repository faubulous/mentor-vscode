import { DragEvent, KeyboardEvent, MouseEvent, useEffect, useMemo, useRef, useState } from 'react';
import { VscodeTextfield } from '@vscode-elements/elements';
import { ValueKind } from '@src/utilities/value-kind';
import { BlankNode, NamedNode } from '@rdfjs/types';
import { ResourcePillData, TermData } from '../form-editor-model';
import { StatementServices } from '../hooks/use-statement-services';
import { Combobox, ComboboxOption } from './combobox';
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
 * Properties of the {@link ResourceValues} component.
 */
export interface ResourceValuesProps {
	/**
	 * The resources of the row, in order.
	 */
	resources: readonly ResourceValueEntry[];

	/**
	 * The resources of the document, which the input offers.
	 */
	documentResources: readonly ResourcePillData[];

	/**
	 * What the predicate takes, which decides how typed text is read.
	 */
	range: ValueKind;

	/**
	 * The text typed into the input.
	 */
	pendingText: string;

	/**
	 * Reads typed text and names the resources on offer.
	 */
	services: StatementServices;

	/**
	 * The hint shown in the empty input.
	 */
	placeholder: string;

	/**
	 * Called with the text of the input as it is typed.
	 */
	onPendingInput: (text: string) => void;

	/**
	 * Called with a resource picked from the list.
	 */
	onPick: (term: NamedNode | BlankNode) => void;

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
	 * Whether the input takes the focus when it appears.
	 */
	autoFocus?: boolean;
}

/**
 * The resources of a statement in one box: a pill per resource and the input of the next value
 * after the last pill, which offers the resources of the document and takes a typed prefixed name,
 * `<iri>` or, where the predicate takes more than resources, text. The box is one stop of Tab, the
 * input; the arrows walk the pills from it. On a pill Backspace and Delete remove it, Alt with an
 * arrow moves it one place, and typing continues in the input. Where the values can be moved, a
 * pill is dragged to another place among the pills, an accent bar showing where it is dropped.
 * Moving changes the order of the values only.
 * @param props The resources and their callbacks.
 * @returns The box.
 */
export function ResourceValues(props: ResourceValuesProps): React.JSX.Element {
	const { resources, documentResources, range, pendingText, services, placeholder, onPendingInput, onPick, onCreate, onRemove, onMove, onStartNode, autoFocus = false } = props;
	const pills = useRef<(HTMLElement | null)[]>([]);
	const fieldRef = useRef<VscodeTextfield>(null);
	const [focusRequest, setFocusRequest] = useState<number>();
	const [drag, setDrag] = useState<PillDragState>();
	const options = useMemo(() => range === 'literal' ? [] : _optionsOf(documentResources, resources, services), [range, documentResources, resources, services]);

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
					onPendingInput(pendingText + event.key);
					fieldRef.current?.focus();
				}
		}
	};

	const handleFieldKeyDown = (event: KeyboardEvent<VscodeTextfield>): void => {
		if (onStartNode && event.key === '[' && pendingText === '') {
			event.preventDefault();
			onStartNode();

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
		<span className="resource-values" onMouseDown={focusFieldOnFreeSpace}>
			{resources.map(({ view, index }, position) => (
				<span key={index} data-value-index={index} className={_dropClassOf(drag, position, resources.length)} {...dragHandlersOf(position)}>
					<ValuePill view={view} pillRef={element => { pills.current[position] = element; }} onKeyDown={handlePillKeyDown(position)} onRemove={() => onRemove(index)} />
				</span>
			))}
			<Combobox
				text={pendingText}
				onTextChange={onPendingInput}
				options={options}
				onPick={onPick}
				onCreate={onCreate}
				onKeyDown={handleFieldKeyDown}
				label="New value"
				placeholder={placeholder}
				className="is-new"
				fieldRef={fieldRef}
			/>
		</span>
	);
}

/**
 * The resources of the document the input offers: those not among the values already, by their
 * label, with their prefixed name and IRI under it.
 * @param documentResources The resources of the document.
 * @param resources The resources of the row.
 * @param services Names the resources by their prefixed names.
 * @returns The options.
 */
function _optionsOf(documentResources: readonly ResourcePillData[], resources: readonly ResourceValueEntry[], services: StatementServices): ComboboxOption<NamedNode | BlankNode>[] {
	const present = new Set(resources.flatMap(({ view }) => view.term.termType === 'NamedNode' ? [view.term.value] : []));

	return documentResources.flatMap(resource => {
		if (resource.subject.termType !== 'NamedNode' || present.has(resource.subject.value)) {
			return [];
		}

		const prefixedName = resource.prefixedName ?? services.resolver.viewOf(resource.subject).prefixedName;

		return [{ label: resource.label, detail: prefixedName ? `${prefixedName}\n${resource.subject.value}` : resource.subject.value, keywords: prefixedName, value: resource.subject }];
	});
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
