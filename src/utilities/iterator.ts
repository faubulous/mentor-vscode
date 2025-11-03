/**
 * Indicates whether the given iterable iterator has any items.
 * @param iterable A iterable iterator.
 * @returns `true` if the iterator has any items, `false` otherwise.
 */
export function any<T>(iterable: IterableIterator<T>): boolean {
	for (const _ of iterable) {
		return true;
	}

	return false;
}

/**
 * Takes items from the beginning of an iterable iterator.
 * @param iterable A iterable iterator.
 * @param count The number of items to consume from the iterator.
 * @returns An array that contains up to `count` items from the iterator.
 */
export function take<T>(iterable: IterableIterator<T>, count: number): T[] {
	const result: T[] = [];
	let i = 0;

	for (const item of iterable) {
		if (i >= count) {
			break;
		}

		result.push(item);
		i++;
	}

	return result;
}