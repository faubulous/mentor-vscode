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
	 * Yields control to the event loop when the work has been busy for longer
	 * than the wall-clock budget since the last yield; otherwise resolves
	 * immediately. Yields a second time when other work kept the event loop
	 * busy for longer than the budget during the first yield.
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
			if (Date.now() - lastYield <= budgetMs) {
				return;
			}

			const yieldStart = Date.now();

			await yieldToEventLoop();

			// Other work that was waiting for the same turn (e.g. the diagnostics of a
			// document that was just parsed) may have run for longer than the budget
			// after the event loop polled for I/O. Yield once more, so that requests
			// which arrived meanwhile are not stuck behind the next phase as well.
			if (Date.now() - yieldStart > budgetMs) {
				await yieldToEventLoop();
			}

			lastYield = Date.now();
		}
	};
}

/**
 * Resolves once the event loop has polled for I/O, so that requests which
 * arrived while the caller was busy (e.g. a go to definition request from the
 * workbench) are handled before the caller continues.
 *
 * A `setTimeout(0)` callback that is already due runs in the timers phase,
 * which Node.js processes before polling for I/O, and a single `setImmediate`
 * scheduled from an I/O callback runs in the check phase right after it. Two
 * `setImmediate` hops always span a poll phase. Where `setImmediate` does not
 * exist (the web extension host), a zero-delay timeout is used.
 */
export function yieldToEventLoop(): Promise<void> {
	if (typeof setImmediate !== 'function') {
		return new Promise(resolve => setTimeout(resolve, 0));
	}

	return new Promise(resolve => setImmediate(() => setImmediate(resolve)));
}
