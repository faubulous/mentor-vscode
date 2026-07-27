import { describe, it, expect, vi, afterEach } from 'vitest';
import { createYieldBudget } from '@src/utilities/scheduling';

/**
 * The yield budget is the cooperative-scheduling primitive behind the indexer,
 * notebook and validation loops: it must never yield while the wall-clock
 * budget lasts (yields cost a macrotask each) and must always yield once it is
 * exhausted (otherwise a CPU-bound loop blocks the extension host).
 */
describe('createYieldBudget', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	function countYields(timeoutSpy: ReturnType<typeof vi.spyOn>): number {
		return (timeoutSpy as any).mock.calls.filter((call: any[]) => call[1] === 0).length;
	}

	it('resolves immediately while the budget is not exhausted', async () => {
		let now = 1000;
		vi.spyOn(Date, 'now').mockImplementation(() => now);
		const timeoutSpy = vi.spyOn(globalThis, 'setTimeout');

		const budget = createYieldBudget(50);

		now += 10;
		await budget.maybeYield();

		expect(countYields(timeoutSpy)).toBe(0);
	});

	it('yields a macrotask once the budget is exceeded and then resets it', async () => {
		let now = 1000;
		vi.spyOn(Date, 'now').mockImplementation(() => now);
		const timeoutSpy = vi.spyOn(globalThis, 'setTimeout');

		const budget = createYieldBudget(50);

		now += 51;
		await budget.maybeYield();

		expect(countYields(timeoutSpy)).toBe(1);

		// The yield reset the budget: the next call within it must not yield again.
		now += 10;
		await budget.maybeYield();

		expect(countYields(timeoutSpy)).toBe(1);
	});

	it('yields repeatedly across a long-running loop', async () => {
		let now = 1000;
		vi.spyOn(Date, 'now').mockImplementation(() => now);
		const timeoutSpy = vi.spyOn(globalThis, 'setTimeout');

		const budget = createYieldBudget(50);

		for (let i = 0; i < 10; i++) {
			now += 60;
			await budget.maybeYield();
		}

		expect(countYields(timeoutSpy)).toBe(10);
	});

	it('uses a 50 ms default budget', async () => {
		let now = 1000;
		vi.spyOn(Date, 'now').mockImplementation(() => now);
		const timeoutSpy = vi.spyOn(globalThis, 'setTimeout');

		const budget = createYieldBudget();

		// Exactly at the budget boundary: not yet exceeded.
		now += 50;
		await budget.maybeYield();

		expect(countYields(timeoutSpy)).toBe(0);

		now += 1;
		await budget.maybeYield();

		expect(countYields(timeoutSpy)).toBe(1);
	});
});
