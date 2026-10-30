import { Virtualizer, useVirtualizer } from '@tanstack/react-virtual';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BlockSizeClass, BlockSizeStats } from '../state/block-size-stats';
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
	 * The offset of a block from the top of the list, measured or estimated.
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
	const sizeClassOf = useCallback((block: FormBlock) => _sizeClassOf(block, cardStates), [cardStates]);

	// The estimates are renewed with the averages of the measured blocks, so the blocks not
	// measured yet take about the room they will take; `estimates` makes the callback new then.
	const estimateSize = useCallback((index: number) => {
		const block = blocks[index];

		return block ? stats.current.estimate(sizeClassOf(block), _unitsOf(block)) : stats.current.estimate('collapsed');
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [blocks, sizeClassOf, estimates]);

	const recordSizes = useSizeRecorder(blocks, sizeClassOf, stats.current, () => setEstimates(revision => revision + 1));
	const getItemKey = useCallback((index: number) => blocks[index]?.id ?? index, [blocks]);

	const virtualizer = useVirtualizer({
		count: blocks.length,
		getScrollElement: () => scrollElement,
		estimateSize,
		getItemKey,
		overscan,
		scrollMargin,
		scrollPaddingStart,
		onChange: recordSizes,
		// Rows are measured as they mount, while React commits: a synchronous render then would be
		// a render inside a render, which React refuses. The next frame shows the measured rows.
		useFlushSync: false
	});

	const virtualItems = virtualizer.getVirtualItems();

	const items = useMemo(() => {
		// Offsets are kept relative to the list, which starts at the scroll margin.
		const result: BlockListItem[] = virtualItems.map(item => ({ index: item.index, blockId: String(item.key), offset: item.start - scrollMargin, size: item.size }));

		if (!pinnedIds?.size) {
			return result;
		}

		// Keep pinned rows mounted so that scrolling away from a row does not unmount the element
		// that holds the focus.
		const present = new Set(result.map(item => item.blockId));

		for (const [index, block] of blocks.entries()) {
			if (pinnedIds.has(block.id) && !present.has(block.id)) {
				result.push({ index, blockId: block.id, offset: _startOf(virtualizer.measurementsCache[index], scrollMargin), size: estimateSize(index) });
			}
		}

		return result.sort((first, second) => first.index - second.index);
	}, [virtualItems, pinnedIds, blocks, virtualizer, estimateSize, scrollMargin]);

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

	const offsetOf = useCallback((index: number) => _startOf(virtualizer.measurementsCache[index], scrollMargin), [virtualizer, scrollMargin]);
	const indexAt = useCallback((offset: number) => _indexAt(virtualizer.measurementsCache, offset + scrollMargin), [virtualizer, scrollMargin]);

	return useMemo(() => ({
		items,
		// The virtualizer's total already leaves out the scroll margin above the list.
		totalSize: virtualizer.getTotalSize(),
		visibleRange,
		measureRow,
		scrollToIndex,
		offsetOf,
		indexAt
	}), [items, virtualizer, visibleRange, measureRow, scrollToIndex, offsetOf, indexAt]);
}

/**
 * Learn from the blocks the list has measured, at most once a frame: their heights go into the
 * statistics, and the estimates are renewed when the averages drifted.
 * @param blocks The blocks of the list.
 * @param sizeClassOf The kind of a block.
 * @param stats The statistics.
 * @param onEstimatesChanged Called when the estimates were renewed.
 * @returns The callback the virtualizer reports its changes to.
 */
function useSizeRecorder(
	blocks: FormBlock[],
	sizeClassOf: (block: FormBlock) => BlockSizeClass,
	stats: BlockSizeStats,
	onEstimatesChanged: () => void
): (instance: Virtualizer<HTMLElement, Element>) => void {
	const frame = useRef<number | undefined>(undefined);
	const latest = useRef({ blocks, sizeClassOf, onEstimatesChanged });

	latest.current = { blocks, sizeClassOf, onEstimatesChanged };

	useEffect(() => () => {
		if (frame.current !== undefined) {
			cancelAnimationFrame(frame.current);
		}
	}, []);

	return useCallback((instance: Virtualizer<HTMLElement, Element>) => {
		if (frame.current !== undefined) {
			return;
		}

		frame.current = requestAnimationFrame(() => {
			frame.current = undefined;

			const byId = new Map(latest.current.blocks.map(block => [block.id, block]));

			for (const [key, size] of instance.itemSizeCache) {
				const block = byId.get(String(key));

				if (block) {
					stats.record(block.id, latest.current.sizeClassOf(block), size, _unitsOf(block));
				}
			}

			if (stats.publish()) {
				latest.current.onEstimatesChanged();
			}
		});
	}, [stats]);
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

	if (block.resource.term.kind === 'bnode' || cardStates.stateOf(block.id).open !== 'collapsed') {
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

/**
 * The offset of a measured row from the top of the list.
 * @param measurement The measurement of the row.
 * @param scrollMargin How far the list starts below the top of the scroll content.
 * @returns The offset.
 */
function _startOf(measurement: { start: number } | undefined, scrollMargin: number): number {
	return measurement ? measurement.start - scrollMargin : 0;
}

/**
 * The index of the block a scroll offset falls in, by a binary search of the measurements, which
 * are in order; the first or the last block beyond them.
 * @param measurements The measurements of the rows.
 * @param offset The offset into the scroll content.
 * @returns The index.
 */
function _indexAt(measurements: readonly { start: number; end: number }[], offset: number): number {
	let low = 0;
	let high = measurements.length - 1;

	while (low < high) {
		const middle = (low + high) >> 1;

		if (measurements[middle].end <= offset) {
			low = middle + 1;
		} else {
			high = middle;
		}
	}

	return Math.max(0, low);
}
