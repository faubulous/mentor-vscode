/**
 * A cooperative-yield budget for CPU-bound loops on the extension host.
 *
 * All parsing, inference and validation runs on the extension-host thread, so a
 * tight loop over many files starves the event loop: the status bar freezes,
 * webviews and trees stop responding and provider requests time out. Awaiting a
 * resolved promise only drains microtasks, which is not enough to unblock the
 * renderer — a macrotask must be scheduled. Yielding after every item would pay
 * a timer per (possibly tiny) item, so the budget yields one macrotask whenever
 * more than the configured wall-clock time has elapsed since the last yield.
 */
export interface YieldBudget {
	/**
	 * Yields control to the event loop for one macrotask when the wall-clock
	 * budget since the last yield is exhausted; otherwise resolves immediately.
	 */
	maybeYield(): Promise<void>;
}

/**
 * Creates a {@link YieldBudget} for one loop or batch run. Budgets track the
 * time of their last yield, so create a fresh one per run instead of sharing.
 * @param budgetMs Wall-clock milliseconds of uninterrupted work allowed between
 * yields. The 50 ms default keeps the UI at ~20 paints/s during a batch.
 */
export function createYieldBudget(budgetMs: number = 50): YieldBudget {
	let lastYield = Date.now();

	return {
		async maybeYield(): Promise<void> {
			if (Date.now() - lastYield > budgetMs) {
				await new Promise<void>(resolve => setTimeout(resolve, 0));

				lastYield = Date.now();
			}
		}
	};
}
