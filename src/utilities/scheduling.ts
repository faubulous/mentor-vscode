/**
 * Lets CPU-bound loops on the extension host hand the event loop a turn.
 *
 * All parsing, inference and validation runs on the extension-host thread, so a
 * tight loop over many files starves the event loop: the status bar freezes,
 * webviews and trees stop responding and provider requests time out. Awaiting a
 * resolved promise only drains microtasks, which is not enough to unblock the
 * renderer — a macrotask must be scheduled. Yielding after every item would pay
 * a timer per (possibly tiny) item, so the yielder yields one macrotask whenever
 * more than the configured wall-clock time has elapsed since the last yield.
 */
export interface EventLoopYielder {
	/**
	 * Yields control to the event loop for one macrotask when the work has been
	 * busy for longer than the wall-clock budget since the last yield; otherwise
	 * resolves immediately.
	 */
	yieldIfBusy(): Promise<void>;
}

/**
 * Creates an {@link EventLoopYielder} for one loop or batch run. A yielder tracks
 * the time of its last yield, so create a fresh one per run instead of sharing.
 * @param budgetMs Wall-clock milliseconds of uninterrupted work allowed between
 * yields. The 50 ms default keeps the UI at ~20 paints/s during a batch.
 */
export function createEventLoopYielder(budgetMs: number = 50): EventLoopYielder {
	let lastYield = Date.now();

	return {
		async yieldIfBusy(): Promise<void> {
			if (Date.now() - lastYield > budgetMs) {
				await new Promise<void>(resolve => setTimeout(resolve, 0));

				lastYield = Date.now();
			}
		}
	};
}
