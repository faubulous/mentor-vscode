import { Virtualizer, measureElement, useVirtualizer } from '@tanstack/react-virtual';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BlockSizeClass, BlockSizeStats, SizedBlock } from '../state/block-size-stats';
import { FormBlock } from '../state/form-block';
import { ResourceCardStates } from '../state/resource-card-states';

/**
 * One row of the virtualized block list.
 */
interface BlockListItem {
	/**
	 * The index of the block.
	 */
	index: number;

	/**
	 * The identifier of the block.
	 */
	blockId: string;

	/**
	 * The offset of the row from the top of the list.
	 */
	offset: number;

	/**
	 * The height of the row, measured or estimated.
	 */
	size: number;
}

/**
 * The visible window of the block list.
 */
export interface BlockListWindow {
	/**
	 * The rows to render.
	 */
	items: BlockListItem[];

	/**
	 * The height of the whole list.
	 */
	totalSize: number;

	/**
	 * The first and last block in the window.
	 */
	visibleRange: { startIndex: number; endIndex: number };

	/**
	 * Measure the element of a row.
	 */
	measureRow: (element: HTMLElement | null) => void;

	/**
	 * Scroll the list to a row.
	 */
	scrollToIndex: (index: number, align?: 'start' | 'center' | 'auto') => void;

	/**
	 * The offset of a block from the top of the list, laid out from the measured and the estimated
	 * heights, so that the blocks never rendered have one too.
	 */
	offsetOf: (index: number) => number;

	/**
	 * The block at an offset from the top of the list, measured or estimated.
	 */
	indexAt: (offset: number) => number;
}

/**
 * Options of {@link useBlockListVirtualizer}.
 */
export interface BlockListVirtualizerOptions {
	/**
	 * The scroll container.
	 */
	scrollElement: HTMLElement | null;

	/**
	 * The blocks of the list.
	 */
	blocks: FormBlock[];

	/**
	 * Which entries are open, whose height grows with their statements.
	 */
	cardStates: ResourceCardStates;

	/**
	 * Rows that must stay mounted even when scrolled out, such as the row being edited.
	 */
	pinnedIds?: ReadonlySet<string>;

	/**
	 * How far the list starts below the top of the scroll content, past the header.
	 */
	scrollMargin?: number;

	/**
	 * How much of the top of the viewport the sticky bars cover, which a row scrolled to stays below.
	 */
	scrollPaddingStart?: number;

	/**
	 * How many rows beyond the viewport are rendered.
	 */
	overscan?: number;
}

/**
 * Windows the blocks of the form so that a document with thousands of resources renders only the
 * rows that are visible. Rows are keyed by block identifier rather than by index, so measured
 * heights survive a document change that inserts or removes resources.
 * @param options The list to window.
 * @returns The visible window.
 */
export function useBlockListVirtualizer(options: BlockListVirtualizerOptions): BlockListWindow {
	const { scrollElement, blocks, cardStates, pinnedIds, scrollMargin = 0, scrollPaddingStart = 0, overscan = 8 } = options;

	const stats = useRef(new BlockSizeStats());
	const [estimates, setEstimates] = useState(0);
	const sizedBlocks = useMemo(() => blocks.map(block => _sizedBlockOf(block, cardStates)), [blocks, cardStates]);

	// The estimates are renewed with the averages of the measured blocks, so the blocks not
	// measured yet take about the room they will take; `estimates` makes the callback new then.
	const estimateSize = useCallback((index: number) => {
		const block = sizedBlocks[index];

		return block ? stats.current.estimate(block.sizeClass, block.units) : stats.current.estimate('collapsed');
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [sizedBlocks, estimates]);

	const measureSize = useSizeRecorder(sizedBlocks, stats.current, () => setEstimates(revision => revision + 1));
	const getItemKey = useCallback((index: number) => blocks[index]?.id ?? index, [blocks]);

	const virtualizer = useVirtualizer({
		count: blocks.length,
		getScrollElement: () => scrollElement,
		estimateSize,
		getItemKey,
		overscan,
		scrollMargin,
		scrollPaddingStart,
		measureElement: measureSize,
		// Rows are measured as they mount, while React commits: a synchronous render then would be
		// a render inside a render, which React refuses. The next frame shows the measured rows.
		useFlushSync: false
	});

	const virtualItems = virtualizer.getVirtualItems();

	// The virtualizer's total already leaves out the scroll margin above the list.
	const totalSize = virtualizer.getTotalSize();

	// The offsets change with the measured heights, which the total follows.
	// eslint-disable-next-line react-hooks/exhaustive-deps
	const offsets = useMemo(() => stats.current.offsetsOf(sizedBlocks), [sizedBlocks, estimates, totalSize]);

	const items = useMemo(() => {
		// Offsets are kept relative to the list, which starts at the scroll margin.
		const result: BlockListItem[] = virtualItems.map(item => ({ index: item.index, blockId: String(item.key), offset: item.start - scrollMargin, size: item.size }));

		if (!pinnedIds?.size) {
			return result;
		}

		// Keep pinned rows mounted so that scrolling away from a row does not unmount the element
		// that holds the focus.
		const present = new Set(result.map(item => item.blockId));

		for (const [index, block] of sizedBlocks.entries()) {
			if (pinnedIds.has(block.id) && !present.has(block.id)) {
				result.push({ index, blockId: block.id, offset: offsets[index] ?? 0, size: stats.current.sizeOf(block) });
			}
		}

		return result.sort((first, second) => first.index - second.index);
	}, [virtualItems, pinnedIds, sizedBlocks, offsets, scrollMargin]);

	const visibleRange = useMemo(() => ({
		startIndex: virtualItems[0]?.index ?? 0,
		endIndex: virtualItems[virtualItems.length - 1]?.index ?? 0
	}), [virtualItems]);

	const measureRow = useCallback((element: HTMLElement | null) => {
		if (element) {
			virtualizer.measureElement(element);
		}
	}, [virtualizer]);

	const scrollToIndex = useCallback((index: number, align: 'start' | 'center' | 'auto' = 'start') => {
		virtualizer.scrollToIndex(index, { align });
	}, [virtualizer]);

	const offsetOf = useCallback((index: number) => offsets[index] ?? 0, [offsets]);
	const indexAt = useCallback((offset: number) => virtualizer.getVirtualItemForOffset(offset + scrollMargin)?.index ?? 0, [virtualizer, scrollMargin]);

	return useMemo(() => ({
		items,
		totalSize,
		visibleRange,
		measureRow,
		scrollToIndex,
		offsetOf,
		indexAt
	}), [items, totalSize, visibleRange, measureRow, scrollToIndex, offsetOf, indexAt]);
}

/**
 * Measure the rows as the virtualizer does and learn from their heights: they go into the
 * statistics, and at most once a frame the estimates are renewed when the averages drifted.
 * @param sizedBlocks The blocks of the list, by the kind of their height.
 * @param stats The statistics.
 * @param onEstimatesChanged Called when the estimates were renewed.
 * @returns The measuring function the virtualizer calls for each row it measures.
 */
function useSizeRecorder(
	sizedBlocks: SizedBlock[],
	stats: BlockSizeStats,
	onEstimatesChanged: () => void
): (element: Element, entry: ResizeObserverEntry | undefined, instance: Virtualizer<HTMLElement, Element>) => number {
	const frame = useRef<number | undefined>(undefined);
	const latest = useRef({ sizedBlocks, onEstimatesChanged });

	latest.current = { sizedBlocks, onEstimatesChanged };

	useEffect(() => () => {
		if (frame.current !== undefined) {
			cancelAnimationFrame(frame.current);
		}
	}, []);

	return useCallback((element: Element, entry: ResizeObserverEntry | undefined, instance: Virtualizer<HTMLElement, Element>) => {
		const size = measureElement(element, entry, instance);
		const block = latest.current.sizedBlocks[instance.indexFromElement(element)];

		if (block) {
			stats.record(block.id, block.sizeClass, size, block.units);
		}

		if (frame.current === undefined) {
			frame.current = requestAnimationFrame(() => {
				frame.current = undefined;

				if (stats.publish()) {
					latest.current.onEstimatesChanged();
				}
			});
		}

		return size;
	}, [stats]);
}

/**
 * Describe a block by what its height depends on: its kind, and for an open entry its statements.
 * @param block The block.
 * @param cardStates Which entries are open.
 * @returns The block as far as its height is concerned.
 */
function _sizedBlockOf(block: FormBlock, cardStates: ResourceCardStates): SizedBlock {
	return { id: block.id, sizeClass: _sizeClassOf(block, cardStates), units: _unitsOf(block) };
}

/**
 * The kind of a block whose heights are alike.
 * @param block The block.
 * @param cardStates Which entries are open.
 * @returns The kind.
 */
function _sizeClassOf(block: FormBlock, cardStates: ResourceCardStates): BlockSizeClass {
	if (block.kind === 'comment') {
		return 'comment';
	}

	if (block.resource.term.termType === 'BlankNode' || cardStates.stateOf(block.id).open !== 'collapsed') {
		return 'open';
	}

	return block.resource.description ? 'collapsedDescribed' : 'collapsed';
}

/**
 * What the height of a block grows with: the statements of an entry, which an open entry shows.
 * @param block The block.
 * @returns The units.
 */
function _unitsOf(block: FormBlock): number {
	return block.kind === 'resource' ? Math.max(1, block.resource.propertyCount) : 1;
}
