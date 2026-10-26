import * as fs from 'fs';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createEventLoopYielder, yieldToEventLoop } from '@src/utilities/scheduling';

/**
 * The event loop yielder is the cooperative-scheduling primitive behind the indexer,
 * notebook and validation loops: it must never yield while the wall-clock
 * budget lasts (yields cost a macrotask each) and must always yield once it is
 * exhausted (otherwise a CPU-bound loop blocks the extension host).
 */
describe('createEventLoopYielder', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	/**
	 * Counts the yields from the `setImmediate` calls; each yield makes two.
	 */
	function countYields(immediateSpy: ReturnType<typeof vi.spyOn>): number {
		return (immediateSpy as any).mock.calls.length / 2;
	}

	it('resolves immediately while the budget is not exhausted', async () => {
		let now = 1000;
		vi.spyOn(Date, 'now').mockImplementation(() => now);
		const timeoutSpy = vi.spyOn(globalThis, 'setImmediate');

		const eventLoop = createEventLoopYielder(50);

		now += 10;
		await eventLoop.yieldIfBusy();

		expect(countYields(timeoutSpy)).toBe(0);
	});

	it('yields a macrotask once the budget is exceeded and then resets it', async () => {
		let now = 1000;
		vi.spyOn(Date, 'now').mockImplementation(() => now);
		const timeoutSpy = vi.spyOn(globalThis, 'setImmediate');

		const eventLoop = createEventLoopYielder(50);

		now += 51;
		await eventLoop.yieldIfBusy();

		expect(countYields(timeoutSpy)).toBe(1);

		// The yield reset the budget: the next call within it must not yield again.
		now += 10;
		await eventLoop.yieldIfBusy();

		expect(countYields(timeoutSpy)).toBe(1);
	});

	it('yields repeatedly across a long-running loop', async () => {
		let now = 1000;
		vi.spyOn(Date, 'now').mockImplementation(() => now);
		const timeoutSpy = vi.spyOn(globalThis, 'setImmediate');

		const eventLoop = createEventLoopYielder(50);

		for (let i = 0; i < 10; i++) {
			now += 60;
			await eventLoop.yieldIfBusy();
		}

		expect(countYields(timeoutSpy)).toBe(10);
	});

	it('yields once more when other work ran longer than the budget during the yield', async () => {
		let now = 1000;
		vi.spyOn(Date, 'now').mockImplementation(() => now);

		const originalSetImmediate = globalThis.setImmediate;

		// Each hop of the yield lets 30 ms of other work run, i.e. 60 ms per yield.
		const immediateSpy = vi.spyOn(globalThis, 'setImmediate').mockImplementation(((callback: () => void) => {
			now += 30;

			return originalSetImmediate(callback);
		}) as any);

		const eventLoop = createEventLoopYielder(50);

		now += 51;
		await eventLoop.yieldIfBusy();

		// Bounded: a second slow yield does not lead to a third.
		expect(countYields(immediateSpy)).toBe(2);
	});

	it('uses a 50 ms default budget', async () => {
		let now = 1000;
		vi.spyOn(Date, 'now').mockImplementation(() => now);
		const timeoutSpy = vi.spyOn(globalThis, 'setImmediate');

		const eventLoop = createEventLoopYielder();

		// Exactly at the budget boundary: not yet exceeded.
		now += 50;
		await eventLoop.yieldIfBusy();

		expect(countYields(timeoutSpy)).toBe(0);

		now += 1;
		await eventLoop.yieldIfBusy();

		expect(countYields(timeoutSpy)).toBe(1);
	});
});

describe('yieldToEventLoop', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('lets I/O that completed while the caller was busy run before it resolves', async () => {
		const order: string[] = [];

		// The caller runs in an I/O callback, like a provider handling a workbench
		// request, and another I/O operation completes while it is busy.
		await new Promise<void>(done => {
			fs.stat(__filename, async () => {
				const io = new Promise<void>(resolve => fs.stat(__filename, () => {
					order.push('io');
					resolve();
				}));

				const busyUntil = Date.now() + 20;

				while (Date.now() < busyUntil) {
					// Busy, as when parsing a large document.
				}

				await yieldToEventLoop();

				order.push('yield');

				await io;
				done();
			});
		});

		expect(order).toEqual(['io', 'yield']);
	});

	it('falls back to a zero-delay timeout without setImmediate', async () => {
		vi.stubGlobal('setImmediate', undefined);

		const timeoutSpy = vi.spyOn(globalThis, 'setTimeout');

		await yieldToEventLoop();

		expect(timeoutSpy).toHaveBeenCalledWith(expect.any(Function), 0);
	});
});
