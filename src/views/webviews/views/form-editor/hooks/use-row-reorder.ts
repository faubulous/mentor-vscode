import { DragEvent, RefObject, useEffect, useState } from 'react';
import { StatementRowEntry } from '../state/statement-rows';
import { RowGripProps } from '../components/row-grip';

/**
 * Before or after a row.
 */
type Placement = 'before' | 'after';

/**
 * How a row takes part in moving the rows of its card.
 */
export interface RowReorder {
	/**
	 * The grip of the row, where the row can be moved.
	 */
	grip?: Omit<RowGripProps, 'label'>;

	/**
	 * Whether this row is the one being dragged.
	 */
	dragged?: boolean;

	/**
	 * Where the dragged row drops next to this row, while the pointer is over the list.
	 */
	dropPlacement?: Placement;
}

/**
 * How the list of the rows of a card takes a row dragged over it, while one of its rows is dragged.
 */
export interface RowListDrop {
	/**
	 * Mark where the dragged row drops, by the height of the pointer.
	 */
	onDragOver?: (event: DragEvent<HTMLElement>) => void;

	/**
	 * Stop marking a place once the pointer leaves the list.
	 */
	onDragLeave?: (event: DragEvent<HTMLElement>) => void;

	/**
	 * Drop the dragged row where the pointer is.
	 */
	onDrop?: (event: DragEvent<HTMLElement>) => void;
}

/**
 * How the rows of a card and their list take part in moving the rows.
 */
export interface RowReordering {
	/**
	 * How a row takes part, or `undefined` for a row that does not.
	 */
	reorderOf: (entry: StatementRowEntry) => RowReorder | undefined;

	/**
	 * How the list takes a dragged row.
	 */
	listDrop: RowListDrop;
}

/**
 * Where a dragged row drops: before or after a row.
 */
interface RowDrop {
	/**
	 * The row it drops next to.
	 */
	entry: StatementRowEntry;

	/**
	 * Whether it drops before or after that row.
	 */
	placement: Placement;
}

/**
 * The row a keyboard move left the focus with, which takes it back once the row stands in its new
 * place.
 */
interface FocusRequest {
	/**
	 * The IRI of the predicate of the row.
	 */
	predicate: string;

	/**
	 * The index the row had among the rows when it was moved.
	 */
	index: number;
}

/**
 * Move the rows of a card by their grips. A dragged row drops into the gap between the rows nearest
 * to the pointer anywhere over the list, so over the row that leads the card it goes first and over
 * the link that adds a property it goes last, and a line marks the place; ↑ and ↓ on a grip move
 * its row one place, and the grip keeps the focus once the row stands in its new place. The rows
 * that only read can be moved next to, but not moved; a row for a new statement is neither. A move
 * that leaves the row where it is writes nothing. The rows of a nested card move among themselves.
 * @param rows The rows of the card, in the order shown, without the row that leads them.
 * @param listRef The element of the list, whose rows are its children.
 * @returns How the rows and the list take part.
 */
export function useRowReorder(rows: readonly StatementRowEntry[], listRef: RefObject<HTMLElement | null>): RowReordering {
	const [dragged, setDragged] = useState<string>();
	const [drop, setDrop] = useState<{ key: string; placement: Placement }>();
	const [focusRequest, setFocusRequest] = useState<FocusRequest>();
	const placed = rows.filter(entry => _predicateOf(entry) !== undefined);

	// The moved row may lose the focus as it is put in its new place; its grip takes it back.
	useEffect(() => {
		if (!focusRequest || rows.filter(entry => _predicateOf(entry) !== undefined).findIndex(entry => _predicateOf(entry) === focusRequest.predicate) === focusRequest.index) {
			return;
		}

		setFocusRequest(undefined);

		if (!document.activeElement || document.activeElement === document.body) {
			_gripOf(listRef.current, focusRequest.predicate)?.focus();
		}
	}, [rows, focusRequest, listRef]);

	const move = (entry: StatementRowEntry, target: StatementRowEntry, placement: Placement, byKeyboard: boolean): void => {
		const from = placed.indexOf(entry);
		const predicate = _predicateOf(entry);
		const targetPredicate = _predicateOf(target);

		if (!predicate || !targetPredicate || _indexAfterMove(from, placed.indexOf(target), placement) === from) {
			return;
		}

		entry.editor?.moveProperty({ target: targetPredicate, placement });

		if (byKeyboard) {
			setFocusRequest({ predicate, index: from });
		}
	};

	const endDrag = (): void => {
		setDragged(undefined);
		setDrop(undefined);
	};

	const showDrop = (next: RowDrop | undefined): void => {
		if (next?.entry.key !== drop?.key || next?.placement !== drop?.placement) {
			setDrop(next ? { key: next.entry.key, placement: next.placement } : undefined);
		}
	};

	const dropAt = (clientY: number): RowDrop | undefined => {
		const source = placed.find(candidate => candidate.key === dragged);

		if (!source) {
			return undefined;
		}

		const from = placed.indexOf(source);
		const gap = _gapAt(_rowElementsOf(listRef.current, placed), clientY);

		if (gap === from || gap === from + 1) {
			return undefined;
		}

		return gap < placed.length ? { entry: placed[gap], placement: 'before' } : { entry: placed[placed.length - 1], placement: 'after' };
	};

	const listDrop: RowListDrop = dragged === undefined ? {} : {
		onDragOver: event => {
			const target = dropAt(event.clientY);

			event.stopPropagation();

			if (target) {
				event.preventDefault();
				event.dataTransfer.dropEffect = 'move';
			}

			showDrop(target);
		},
		onDragLeave: event => {
			const next = event.relatedTarget;

			if (!(next instanceof Node) || !event.currentTarget.contains(next)) {
				showDrop(undefined);
			}
		},
		onDrop: event => {
			const target = dropAt(event.clientY);
			const source = placed.find(candidate => candidate.key === dragged);

			event.preventDefault();
			event.stopPropagation();
			endDrag();

			if (target && source) {
				move(source, target.entry, target.placement, false);
			}
		}
	};

	const reorderOf = (entry: StatementRowEntry): RowReorder | undefined => {
		const position = placed.indexOf(entry);

		if (position < 0) {
			return undefined;
		}

		const movable = entry.editor !== undefined && !entry.editor.isNew;
		const grip: RowReorder['grip'] = movable
			? {
				onMoveUp: position > 0 ? () => move(entry, placed[position - 1], 'before', true) : undefined,
				onMoveDown: position < placed.length - 1 ? () => move(entry, placed[position + 1], 'after', true) : undefined,
				onDragStart: event => {
					_startDrag(event, _predicateOf(entry)!);
					setDragged(entry.key);
				},
				onDragEnd: endDrag
			}
			: undefined;

		return {
			grip,
			dragged: dragged === entry.key,
			dropPlacement: drop?.key === entry.key ? drop.placement : undefined
		};
	};

	return { reorderOf, listDrop };
}

/**
 * Start dragging a row by its grip. Nothing follows the pointer: an image of the grip would bring
 * along what is painted at its edges, and the line that marks where the row drops is enough.
 * @param event The event of the drag.
 * @param predicate The IRI of the predicate of the row.
 */
function _startDrag(event: DragEvent<HTMLElement>, predicate: string): void {
	event.stopPropagation();
	event.dataTransfer.effectAllowed = 'move';
	event.dataTransfer.setData('text/plain', predicate);

	_setEmptyDragImage(event);
}

/**
 * Make the image that follows the pointer while dragging empty. The browser takes the image of an
 * element in the document as the drag starts, so an empty element is added for that moment.
 * @param event The event of the drag.
 */
function _setEmptyDragImage(event: DragEvent<HTMLElement>): void {
	const empty = document.createElement('span');

	empty.style.position = 'fixed';
	empty.style.top = '0';
	empty.style.left = '0';
	empty.style.width = '1px';
	empty.style.height = '1px';
	empty.style.opacity = '0';
	document.body.appendChild(empty);
	event.dataTransfer.setDragImage(empty, 0, 0);
	setTimeout(() => empty.remove(), 0);
}

/**
 * The gap between rows a height falls into: the number of rows whose middle lies above it.
 * @param elements The elements of the rows, in order.
 * @param clientY The height, in the coordinates of the view.
 * @returns The index of the gap, from zero before the first row to the number of rows after the last.
 */
function _gapAt(elements: readonly Element[], clientY: number): number {
	return elements.filter(element => {
		const bounds = element.getBoundingClientRect();

		return bounds.top + bounds.height / 2 < clientY;
	}).length;
}

/**
 * Find the elements of rows among the children of their list.
 * @param list The element of the list.
 * @param entries The rows, each showing a property.
 * @returns The elements found, in the order of the rows.
 */
function _rowElementsOf(list: HTMLElement | null, entries: readonly StatementRowEntry[]): Element[] {
	const children = Array.from(list?.children ?? []);

	return entries.flatMap(entry => children.filter(child => child.getAttribute('data-predicate') === _predicateOf(entry)).slice(0, 1));
}

/**
 * The index a row has among the rows after it moves next to another.
 * @param from The index of the row.
 * @param to The index of the row it moves next to.
 * @param placement Whether it moves before or after that row.
 * @returns The index.
 */
function _indexAfterMove(from: number, to: number, placement: Placement): number {
	const index = placement === 'before' ? to : to + 1;

	return index > from ? index - 1 : index;
}

/**
 * The IRI of the predicate of a row, where the row shows a property.
 * @param entry The row.
 * @returns The IRI, or `undefined` for a row of a new statement.
 */
function _predicateOf(entry: StatementRowEntry): string | undefined {
	const term = entry.property?.predicate.term;

	return term?.termType === 'NamedNode' ? term.value : undefined;
}

/**
 * Find the grip of the row of a predicate among the rows of a list.
 * @param list The element of the list.
 * @param predicate The IRI of the predicate.
 * @returns The grip, if the row shows one.
 */
function _gripOf(list: HTMLElement | null, predicate: string): HTMLElement | null | undefined {
	const row = Array.from(list?.children ?? []).find(child => child.getAttribute('data-predicate') === predicate);

	return row?.querySelector<HTMLElement>(':scope > .row-grip-area > .row-grip');
}
