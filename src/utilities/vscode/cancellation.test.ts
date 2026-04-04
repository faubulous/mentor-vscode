import { describe, it, expect } from 'vitest';
import { CancellationError, withCancellation, toArrayWithCancellation } from './cancellation';

function makeToken(cancelled = false) {
	const listeners: Array<() => void> = [];
	const token = {
		isCancellationRequested: cancelled,
		onCancellationRequested: (fn: () => void) => {
			listeners.push(fn);
			return { dispose: () => listeners.splice(listeners.indexOf(fn), 1) };
		},
		_cancel: () => {
			token.isCancellationRequested = true;
			listeners.forEach(fn => fn());
		},
	};
	return token;
}

async function* asyncGen<T>(items: T[]): AsyncIterable<T> {
	for (const item of items) {
		yield item;
	}
}

describe('CancellationError', () => {
	it('is an instance of Error', () => {
		expect(new CancellationError()).toBeInstanceOf(Error);
	});

	it('has the expected message', () => {
		expect(new CancellationError().message).toBe('Operation canceled');
	});

	it('has name CancellationError', () => {
		expect(new CancellationError().name).toBe('CancellationError');
	});

	it('has statusCode 499', () => {
		expect(new CancellationError().statusCode).toBe(499);
	});
});

describe('withCancellation', () => {
	it('resolves with the value when no token is provided', async () => {
		const result = await withCancellation(Promise.resolve(42));
		expect(result).toBe(42);
	});

	it('resolves with the value when token is not cancelled', async () => {
		const token = makeToken(false);
		const result = await withCancellation(Promise.resolve('hello'), token as any);
		expect(result).toBe('hello');
	});

	it('rejects immediately when token is already cancelled', async () => {
		const token = makeToken(true);
		await expect(withCancellation(Promise.resolve(1), token as any))
			.rejects.toBeInstanceOf(CancellationError);
	});

	it('rejects with CancellationError when token fires mid-flight', async () => {
		const token = makeToken(false);
		// Create a promise that never resolves on its own
		const never = new Promise<number>(() => {});
		const racePromise = withCancellation(never, token as any);
		// Fire cancellation after registering
		token._cancel();
		await expect(racePromise).rejects.toBeInstanceOf(CancellationError);
	});

	it('passes through the original rejection when token is not cancelled', async () => {
		const token = makeToken(false);
		const err = new Error('original');
		await expect(withCancellation(Promise.reject(err), token as any))
			.rejects.toBe(err);
	});

	it('disposes the subscription after promise resolves', async () => {
		const token = makeToken(false);
		let disposeCount = 0;
		const origOn = token.onCancellationRequested.bind(token);
		(token as any).onCancellationRequested = (fn: () => void) => {
			const sub = origOn(fn);
			return { dispose: () => { disposeCount++; sub.dispose(); } };
		};
		await withCancellation(Promise.resolve(1), token as any);
		expect(disposeCount).toBe(1);
	});
});

// ─── toArrayWithCancellation ───────────────────────────────────────────────

describe('toArrayWithCancellation', () => {
	it('collects all items when no token is provided', async () => {
		const result = await toArrayWithCancellation(asyncGen([1, 2, 3]));
		expect(result).toEqual([1, 2, 3]);
	});

	it('collects all items when token is not cancelled', async () => {
		const token = makeToken(false);
		const result = await toArrayWithCancellation(asyncGen(['a', 'b']), token as any);
		expect(result).toEqual(['a', 'b']);
	});

	it('returns empty array from an empty iterable', async () => {
		const result = await toArrayWithCancellation(asyncGen([]));
		expect(result).toEqual([]);
	});

	it('rejects immediately when token is already cancelled', async () => {
		const token = makeToken(true);
		await expect(toArrayWithCancellation(asyncGen([1, 2, 3]), token as any))
			.rejects.toBeInstanceOf(CancellationError);
	});

	it('rejects with CancellationError when token fires during iteration', async () => {
		const token = makeToken(false);

		async function* slowGen(): AsyncIterable<number> {
			yield 1;
			// Pause to allow cancellation to be triggered
			await new Promise(resolve => setTimeout(resolve, 10));
			yield 2;
			yield 3;
		}

		const collectionPromise = toArrayWithCancellation(slowGen(), token as any);
		// Cancel after a short delay (while iteration is paused)
		setTimeout(() => token._cancel(), 5);
		await expect(collectionPromise).rejects.toBeInstanceOf(CancellationError);
	});

	it('stops mid-stream when cancelled (does not collect all items)', async () => {
		const token = makeToken(false);
		const collected: number[] = [];

		async function* trackingGen(): AsyncIterable<number> {
			for (let i = 0; i < 100; i++) {
				collected.push(i);
				yield i;
				await new Promise(resolve => setTimeout(resolve, 1));
			}
		}

		const p = toArrayWithCancellation(trackingGen(), token as any);
		setTimeout(() => token._cancel(), 5);
		await expect(p).rejects.toBeInstanceOf(CancellationError);
		expect(collected.length).toBeLessThan(100);
	});
});
