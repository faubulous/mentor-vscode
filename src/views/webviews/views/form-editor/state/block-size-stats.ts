/**
 * The kinds of block whose heights are alike: comments, collapsed entries with and without a
 * description line, and open entries, whose height grows with their statements.
 */
export type BlockSizeClass = 'comment' | 'collapsed' | 'collapsedDescribed' | 'open';

/**
 * The heights assumed for a kind of block before any of its blocks was measured.
 */
const DEFAULT_SIZES: Record<BlockSizeClass, number> = {
	comment: 44,
	collapsed: 66,
	collapsedDescribed: 90,
	open: 30
};

/**
 * How far an average may drift before the estimates are worth renewing, in pixels.
 */
const TOLERANCE = 2;

/**
 * One measured block: its kind, its height and the units its height grows with.
 */
interface MeasuredBlock {
	/**
	 * The kind of the block.
	 */
	sizeClass: BlockSizeClass;

	/**
	 * The measured height.
	 */
	size: number;

	/**
	 * What the height grows with: the statements of an open entry, one otherwise.
	 */
	units: number;
}

/**
 * The measured heights of the blocks of a list, from which the heights of the blocks not
 * measured yet are estimated: the average height of the blocks of the same kind, per statement
 * for open entries. Good estimates keep the total height, and with it the scrollbar, steady while
 * the list is scrolled and its blocks are measured one by one.
 */
export class BlockSizeStats {
	private readonly _measured = new Map<string, MeasuredBlock>();

	private _published: Record<BlockSizeClass, number> = { ...DEFAULT_SIZES };

	/**
	 * Record the measured height of a block.
	 * @param id The block.
	 * @param sizeClass Its kind.
	 * @param size Its measured height.
	 * @param units What its height grows with: its statements for an open entry, one otherwise.
	 */
	record(id: string, sizeClass: BlockSizeClass, size: number, units = 1): void {
		this._measured.set(id, { sizeClass, size, units: Math.max(1, units) });
	}

	/**
	 * Estimate the height of a block not measured yet, from the averages last published.
	 * @param sizeClass Its kind.
	 * @param units What its height grows with.
	 * @returns The estimated height.
	 */
	estimate(sizeClass: BlockSizeClass, units = 1): number {
		return Math.round(this._published[sizeClass] * (sizeClass === 'open' ? Math.max(1, units) : 1));
	}

	/**
	 * Take the current averages as the estimates when they drifted from the last ones.
	 * @returns Whether the estimates changed, so the list has to lay out its blocks again.
	 */
	publish(): boolean {
		const averages = this._averages();
		const changed = (Object.keys(averages) as BlockSizeClass[]).some(sizeClass => Math.abs(averages[sizeClass] - this._published[sizeClass]) > TOLERANCE * (sizeClass === 'open' ? 0.25 : 1));

		if (changed) {
			this._published = averages;
		}

		return changed;
	}

	/**
	 * The average height per unit of each kind, the default where none was measured.
	 * @returns The averages by kind.
	 */
	private _averages(): Record<BlockSizeClass, number> {
		const totals = new Map<BlockSizeClass, { size: number; units: number }>();

		for (const block of this._measured.values()) {
			const total = totals.get(block.sizeClass) ?? { size: 0, units: 0 };

			total.size += block.size;
			total.units += block.sizeClass === 'open' ? block.units : 1;
			totals.set(block.sizeClass, total);
		}

		const averages = { ...DEFAULT_SIZES };

		for (const [sizeClass, total] of totals) {
			averages[sizeClass] = total.size / total.units;
		}

		return averages;
	}
}
