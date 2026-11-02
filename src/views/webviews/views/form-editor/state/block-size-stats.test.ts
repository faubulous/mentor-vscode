import { describe, expect, it } from 'vitest';
import { BlockSizeStats } from './block-size-stats';

describe('BlockSizeStats', () => {
	it('estimates from defaults before anything was measured', () => {
		const stats = new BlockSizeStats();

		expect(stats.estimate('collapsed')).toBe(66);
		expect(stats.estimate('open', 3)).toBe(90);
	});

	it('estimates from the average of the measured blocks of a kind once published', () => {
		const stats = new BlockSizeStats();

		stats.record('a', 'collapsed', 80);
		stats.record('b', 'collapsed', 100);

		expect(stats.estimate('collapsed')).toBe(66);
		expect(stats.publish()).toBe(true);
		expect(stats.estimate('collapsed')).toBe(90);
	});

	it('estimates open entries per statement', () => {
		const stats = new BlockSizeStats();

		stats.record('a', 'open', 200, 4);
		stats.record('b', 'open', 100, 1);
		stats.publish();

		expect(stats.estimate('open', 2)).toBe(120);
	});

	it('keeps the estimates while the averages stay within the tolerance', () => {
		const stats = new BlockSizeStats();

		stats.record('a', 'comment', 44.5);

		expect(stats.publish()).toBe(false);
	});

	it('replaces the height of a block measured again', () => {
		const stats = new BlockSizeStats();

		stats.record('a', 'collapsed', 200);
		stats.record('a', 'collapsed', 70);
		stats.publish();

		expect(stats.estimate('collapsed')).toBe(70);
	});
});

describe('BlockSizeStats layout', () => {
	it('takes the measured height of a block and the estimate of a block not measured', () => {
		const stats = new BlockSizeStats();

		stats.record('a', 'collapsed', 80);

		expect(stats.sizeOf({ id: 'a', sizeClass: 'collapsed', units: 1 })).toBe(80);
		expect(stats.sizeOf({ id: 'b', sizeClass: 'open', units: 2 })).toBe(60);
	});

	it('lays the blocks out one below the other from the measured and the estimated heights', () => {
		const stats = new BlockSizeStats();

		stats.record('b', 'comment', 50);

		const offsets = stats.offsetsOf([
			{ id: 'a', sizeClass: 'collapsed', units: 1 },
			{ id: 'b', sizeClass: 'comment', units: 1 },
			{ id: 'c', sizeClass: 'open', units: 3 },
			{ id: 'd', sizeClass: 'collapsed', units: 1 }
		]);

		expect(offsets).toEqual([0, 66, 116, 206]);
	});
});
