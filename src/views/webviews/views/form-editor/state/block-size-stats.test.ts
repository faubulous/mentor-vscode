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
