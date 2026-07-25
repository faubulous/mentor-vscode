/**
 * A trailing-edge debouncer: {@link schedule} (re)arms a timer and the callback
 * runs once the calls stop for the configured delay. Replaces the hand-rolled
 * clear/set/dispose timer bookkeeping that otherwise accumulates per call site.
 */
export class Debouncer {
	private _timer: ReturnType<typeof setTimeout> | undefined;

	/**
	 * @param _delayMs The trailing delay in milliseconds.
	 */
	constructor(private readonly _delayMs: number) { }

	/**
	 * Schedules the callback, resetting any pending timer. Only the callback of
	 * the most recent call runs.
	 */
	schedule(callback: () => void): void {
		this.cancel();

		this._timer = setTimeout(() => {
			this._timer = undefined;
			callback();
		}, this._delayMs);
	}

	/**
	 * Cancels the pending callback, if any.
	 */
	cancel(): void {
		if (this._timer) {
			clearTimeout(this._timer);
			this._timer = undefined;
		}
	}

	dispose(): void {
		this.cancel();
	}
}

/**
 * A trailing-edge debouncer with one independent timer per key (e.g. per
 * document URI), so bursts on one key do not delay another.
 */
export class KeyedDebouncer<K = string> {
	private readonly _timers = new Map<K, ReturnType<typeof setTimeout>>();

	/**
	 * @param _delayMs The trailing delay in milliseconds.
	 */
	constructor(private readonly _delayMs: number) { }

	/**
	 * Schedules the callback for a key, resetting that key's pending timer. Only
	 * the callback of the most recent call per key runs.
	 */
	schedule(key: K, callback: () => void): void {
		this.cancel(key);

		this._timers.set(key, setTimeout(() => {
			this._timers.delete(key);
			callback();
		}, this._delayMs));
	}

	/**
	 * Cancels the pending callback for a key, if any.
	 */
	cancel(key: K): void {
		const timer = this._timers.get(key);

		if (timer) {
			clearTimeout(timer);
			this._timers.delete(key);
		}
	}

	dispose(): void {
		for (const timer of this._timers.values()) {
			clearTimeout(timer);
		}

		this._timers.clear();
	}
}
