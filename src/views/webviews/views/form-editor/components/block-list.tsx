import { RefObject, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useBlockListVirtualizer } from '../hooks/use-block-list-virtualizer';
import { useStickyHeight } from '../hooks/use-sticky-height';
import { IResourceDataService } from '../services/resource-data-service.interface';
import { FormBlock } from '../state/form-block';
import { ResourceCardStates } from '../state/resource-card-states';
import { CommentBlock } from './comment-block';
import { PositionRail, RailMark } from './position-rail';
import { ResourceCard } from './resource-card';

/**
 * How many rows beyond the viewport are loaded, so that scrolling does not reveal empty rows.
 */
const PREFETCH_MARGIN = 15;

/**
 * A resource to scroll to; a new request object scrolls again, even to the same resource.
 */
export interface RevealRequest {
	/**
	 * The resource.
	 */
	resourceId: string;
}

/**
 * Properties of the {@link BlockList} component.
 */
export interface BlockListProps {
	/**
	 * The blocks of the form, in order.
	 */
	blocks: FormBlock[];

	/**
	 * Supplies the statements of the resources, asked for around the viewport.
	 */
	dataService: IResourceDataService;

	/**
	 * The scroll container, supplied by the form so the header shares the same scroll.
	 */
	scrollElement: HTMLElement | null;

	/**
	 * Which entries are expanded.
	 */
	cardStates: ResourceCardStates;

	/**
	 * Rows kept mounted while off screen, such as the row holding the focus.
	 */
	pinnedIds?: ReadonlySet<string>;

	/**
	 * The resources whose writes are not done, whose cards keep their statements mounted even when
	 * collapsed.
	 */
	busyIds?: ReadonlySet<string>;

	/**
	 * Expands an entry or folds it again.
	 */
	onToggle: (resourceId: string) => void;

	/**
	 * A resource to scroll to.
	 */
	revealRequest?: RevealRequest;

	/**
	 * The column beside the scroll area the position rail is drawn into.
	 */
	railElement?: HTMLElement | null;

	/**
	 * Whether a filter narrows the list, which marks every entry on the rail as a match.
	 */
	filtering?: boolean;

	/**
	 * Tells which card is under the top of the view, or none while the header is in view.
	 */
	onCurrentChange?: (resourceId: string | undefined) => void;
}

/**
 * The virtualized list of the blocks of the form: resource cards and the comments between
 * them. Only the visible rows are rendered, and only the statements of the cards around the
 * viewport are requested, so a document with thousands of resources costs no more than one with
 * a screenful.
 * @param props The blocks, the scroll container and the state of the entries.
 * @returns The list.
 */
export function BlockList({ blocks, dataService, scrollElement, cardStates, pinnedIds, busyIds, onToggle, revealRequest, railElement, filtering, onCurrentChange }: BlockListProps): React.JSX.Element {
	const listRef = useRef<HTMLDivElement>(null);
	const scrollMargin = useListPlacement(listRef, scrollElement);
	const stickyHeight = useStickyHeight(scrollElement);
	const window = useBlockListVirtualizer({ scrollElement, blocks, cardStates, pinnedIds, scrollMargin, scrollPaddingStart: stickyHeight });
	const { startIndex, endIndex } = window.visibleRange;

	usePrefetch(dataService, blocks, startIndex, endIndex);
	useRevealRequest(revealRequest, blocks, window.scrollToIndex);

	const currentId = useCurrentEntry(scrollElement, blocks, window.indexAt, scrollMargin, stickyHeight, onCurrentChange);
	const marks = useRailMarks(blocks, window.offsetOf, window.totalSize, scrollMargin, filtering === true);
	const measureRow = useCallback((element: HTMLElement | null) => window.measureRow(element), [window]);

	return (
		<>
			<div ref={listRef} className="block-list" style={{ height: window.totalSize, position: 'relative' }}>
				{window.items.map(item => {
					const block = blocks[item.index];

					if (!block) {
						return undefined;
					}

					return (
						<div
							key={item.blockId}
							className={`form-block is-${block.kind}`}
							ref={measureRow}
							data-index={item.index}
							data-block-id={block.id}
							style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${item.offset}px)` }}
						>
							{block.kind === 'resource'
								? <ResourceCard summary={block.resource} dataService={dataService} expanded={cardStates.stateOf(block.id).open !== 'collapsed'} writing={busyIds?.has(block.id) === true} current={block.id === currentId} onToggle={onToggle} />
								: <CommentBlock text={block.text} />}
						</div>
					);
				})}
			</div>
			{railElement && createPortal(<PositionRail scrollElement={scrollElement} marks={marks} contentHeight={window.totalSize + scrollMargin} />, railElement)}
		</>
	);
}

/**
 * Ask for the statements of every entry in and around the viewport, collapsed ones too, so an
 * entry opens with its statements at hand instead of waiting for them. The host builds a detail
 * in well under a millisecond, and the service sends each request only once.
 * @param dataService The data service.
 * @param blocks The blocks of the list.
 * @param startIndex The first block in the window.
 * @param endIndex The last block in the window.
 */
function usePrefetch(dataService: IResourceDataService, blocks: FormBlock[], startIndex: number, endIndex: number): void {
	useEffect(() => {
		const from = Math.max(0, startIndex - PREFETCH_MARGIN);
		const to = Math.min(blocks.length - 1, endIndex + PREFETCH_MARGIN);
		const needed: string[] = [];

		for (let index = from; index <= to; index++) {
			const block = blocks[index];

			if (block?.kind === 'resource' && !dataService.get(block.id)) {
				needed.push(block.id);
			}
		}

		if (needed.length > 0) {
			dataService.request(needed);
		}
	}, [startIndex, endIndex, blocks, dataService]);
}

/**
 * Follow the entry under the top of the view, below the bars that stay there: the guide word of
 * the context bar, marked in the list. None while the list starts below the top, as when the
 * header is in view.
 * @param scrollElement The scroll container.
 * @param blocks The blocks of the list.
 * @param indexAt Finds the block at an offset.
 * @param scrollMargin How far the list starts below the top of the scroll content.
 * @param stickyHeight How much of the top of the viewport the sticky bars cover.
 * @param onCurrentChange Told of the current entry.
 * @returns The identifier of the current entry.
 */
function useCurrentEntry(
	scrollElement: HTMLElement | null,
	blocks: FormBlock[],
	indexAt: (offset: number) => number,
	scrollMargin: number,
	stickyHeight: number,
	onCurrentChange: ((resourceId: string | undefined) => void) | undefined
): string | undefined {
	const [current, setCurrent] = useState<string>();

	useEffect(() => {
		if (!scrollElement) {
			return;
		}

		let frame = 0;
		const update = (): void => {
			frame = 0;
			setCurrent(_entryAt(blocks, indexAt, scrollElement.scrollTop + stickyHeight - scrollMargin));
		};
		const schedule = (): void => {
			frame ||= requestAnimationFrame(update);
		};

		update();
		scrollElement.addEventListener('scroll', schedule, { passive: true });

		return () => {
			scrollElement.removeEventListener('scroll', schedule);
			cancelAnimationFrame(frame);
		};
	}, [scrollElement, blocks, indexAt, scrollMargin, stickyHeight]);

	useEffect(() => onCurrentChange?.(current), [current, onCurrentChange]);

	return current;
}

/**
 * The entry at an offset into the list: the one the offset falls in, or the first after a comment.
 * @param blocks The blocks of the list.
 * @param indexAt Finds the block at an offset.
 * @param offset The offset into the list.
 * @returns The identifier of the entry, or `undefined` above the list.
 */
function _entryAt(blocks: FormBlock[], indexAt: (offset: number) => number, offset: number): string | undefined {
	if (offset < 0 || blocks.length === 0) {
		return undefined;
	}

	for (let index = indexAt(offset); index < blocks.length; index++) {
		if (blocks[index].kind === 'resource') {
			return blocks[index].id;
		}
	}

	return undefined;
}

/**
 * The marks of the position rail: a tick per entry, or a match mark while filtering, and a mark
 * per comment, where each starts in the scroll content.
 * @param blocks The blocks of the list.
 * @param offsetOf Finds the offset of a block.
 * @param totalSize The height of the list, which changes with the measured sizes.
 * @param scrollMargin How far the list starts below the top of the scroll content.
 * @param filtering Whether a filter narrows the list.
 * @returns The marks.
 */
function useRailMarks(blocks: FormBlock[], offsetOf: (index: number) => number, totalSize: number, scrollMargin: number, filtering: boolean): RailMark[] {
	return useMemo(() => blocks.map((block, index): RailMark => ({
		kind: block.kind === 'comment' ? 'comment' : filtering ? 'match' : 'resource',
		offset: scrollMargin + offsetOf(index),
		title: block.kind === 'resource' ? block.resource.label : 'Comment'
	})),
	// The offsets change with the measured sizes, which the total size follows.
	// eslint-disable-next-line react-hooks/exhaustive-deps
	[blocks, totalSize, scrollMargin, filtering]);
}

/**
 * Scroll the entry of a requested resource to the top of the list. The list is virtualized, so
 * the entry may not be rendered yet: the virtualizer scrolls to its row, which renders it.
 * @param request The resource to scroll to, if one was asked for.
 * @param blocks The blocks of the list.
 * @param scrollToIndex Scrolls the list to a row.
 */
function useRevealRequest(request: RevealRequest | undefined, blocks: FormBlock[], scrollToIndex: (index: number, align?: 'start' | 'center' | 'auto') => void): void {
	const handled = useRef<RevealRequest | undefined>(undefined);

	useEffect(() => {
		if (!request || handled.current === request) {
			return;
		}

		const index = blocks.findIndex(block => block.kind === 'resource' && block.id === request.resourceId);

		// The blocks may not hold the resource yet, while a filter that left it out is being lifted.
		if (index >= 0) {
			handled.current = request;
			scrollToIndex(index, 'start');
		}
	}, [request, blocks, scrollToIndex]);
}

/**
 * Measure where the list sits in the scroll content, again whenever the content above it changes
 * size: how far below the top of the content it starts, past the header.
 * @param listRef The list.
 * @param scrollElement The scroll container.
 * @returns The offset of the list in the scroll content.
 */
function useListPlacement(listRef: RefObject<HTMLDivElement | null>, scrollElement: HTMLElement | null): number {
	const [scrollMargin, setScrollMargin] = useState(0);

	useLayoutEffect(() => {
		const list = listRef.current;
		const content = list?.parentElement;

		if (!list || !content || !scrollElement) {
			return;
		}

		const measure = (): void => {
			const listTop = list.getBoundingClientRect().top;

			setScrollMargin(Math.round(listTop - scrollElement.getBoundingClientRect().top + scrollElement.scrollTop));
		};
		const observer = new ResizeObserver(measure);

		measure();
		observer.observe(content);

		for (const child of Array.from(content.children)) {
			if (child !== list) {
				observer.observe(child);
			}
		}

		return () => observer.disconnect();
	}, [listRef, scrollElement]);

	return scrollMargin;
}
