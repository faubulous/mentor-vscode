import * as vscode from 'vscode';

/**
 * Error type representing the cancellation of an operation.
 */
export class CancellationError extends Error {
	/**
	 * The name of the error.
	 */
	readonly name = 'CancellationError';

	/**
	 * HTTP status code representing client-closed request.
	 */
	readonly statusCode: number = 499;

	constructor() {
		super('Operation canceled');
	}
}

/**
 * Wraps a promise with a cancellation token.
 * @param promise The promise to wrap.
 * @param token The cancellation token.
 * @returns A promise that resolves or rejects based on the original promise, or rejects with a cancellation error if the token is triggered.
 */
export async function withCancellation<T>(
	promise: Promise<T>,
	token?: vscode.CancellationToken
): Promise<T> {
	if (!token) {
		return promise;
	} else {
		return new Promise<T>((resolve, reject) => {
			if (token.isCancellationRequested) {
				reject(new CancellationError());
			} else {
				const subscription = token.onCancellationRequested(() => {
					console.log("withCancellation: Cancellation requested");

					subscription.dispose();

					reject(new CancellationError());
				});

				promise.then(
					v => { subscription.dispose(); resolve(v); },
					e => { subscription.dispose(); reject(e); }
				);
			}
		});
	}
}

/**
 * Collects any AsyncIterable into an array with VS Code cancellation.
 * @remarks Uses a for-await loop; no dependency on .toArray().
 */
export async function toArrayWithCancellation<T>(
	iterable: AsyncIterable<T>,
	token?: vscode.CancellationToken
): Promise<T[]> {
	if (!token) {
		// Fast path: no token => plain for-await.
		return _toArray(iterable);
	} else {
		// Cancellation-aware: race each next() against a cancel promise.
		return _toArrayWithCancellation(iterable, token);
	}
}

/**
 * Collects all items from a generic async iterable into an array.
 * @param iterable A generic async iterable.
 * @returns An array of all items from the iterable.
 */
async function _toArray<T>(iterable: AsyncIterable<T>): Promise<T[]> {
	const result: T[] = [];

	try {
		for await (const item of iterable) {
			result.push(item);
		}
	} finally {
		_tryClose(iterable);
	}

	return result;
}

/**
 * Collects all items from a generic async iterable into an array.
 * @param iterable A generic async iterable.
 * @param token A cancellation token.
 * @returns An array of all items from the iterable.
 */
async function _toArrayWithCancellation<T>(
	iterable: AsyncIterable<T>,
	token: vscode.CancellationToken
): Promise<T[]> {
	if (token.isCancellationRequested) {
		_tryClose(iterable);

		throw new CancellationError();
	}

	let subscription: vscode.Disposable | undefined;

	console.log("_toArrayWithCancellation");

	const cancel = new Promise<never>((_, reject) => {
		subscription = token.onCancellationRequested(() => {
			console.log("_toArrayWithCancellation.onCancellationRequested");

			_tryClose(iterable);

			reject(new CancellationError());
		});
	});

	try {
		const result: T[] = [];
		const iterator = iterable[Symbol.asyncIterator]();

		while (true) {			
			const next = iterator.next();
			const race = await Promise.race([next, cancel]) as IteratorResult<T>;

			if (race.done) break;

			result.push(race.value);
		}

		return result;
	} finally {
		subscription?.dispose();

		_tryClose(iterable);
	}
}

function _tryClose(iterator: any) {
	try { iterator.return?.(); } catch { }
	try { iterator.close?.(); } catch { }
	try { iterator.destroy?.(); } catch { }
}