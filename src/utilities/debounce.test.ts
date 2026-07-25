import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { Debouncer, KeyedDebouncer } from './debounce';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('Debouncer', () => {
	test('runs only the last scheduled callback after the delay', () => {
		const debouncer = new Debouncer(100);
		const calls: number[] = [];

		debouncer.schedule(() => calls.push(1));
		debouncer.schedule(() => calls.push(2));
		vi.advanceTimersByTime(99);
		expect(calls).toEqual([]);

		vi.advanceTimersByTime(1);
		expect(calls).toEqual([2]);
	});

	test('cancel and dispose drop the pending callback', () => {
		const debouncer = new Debouncer(100);
		const callback = vi.fn();

		debouncer.schedule(callback);
		debouncer.cancel();
		vi.advanceTimersByTime(200);
		expect(callback).not.toHaveBeenCalled();

		debouncer.schedule(callback);
		debouncer.dispose();
		vi.advanceTimersByTime(200);
		expect(callback).not.toHaveBeenCalled();
	});
});

describe('KeyedDebouncer', () => {
	test('keys debounce independently', () => {
		const debouncer = new KeyedDebouncer(100);
		const calls: string[] = [];

		debouncer.schedule('a', () => calls.push('a1'));
		vi.advanceTimersByTime(50);
		debouncer.schedule('b', () => calls.push('b1'));
		debouncer.schedule('a', () => calls.push('a2'));

		vi.advanceTimersByTime(100);
		expect(calls.sort()).toEqual(['a2', 'b1']);
	});

	test('dispose cancels all pending keys', () => {
		const debouncer = new KeyedDebouncer(100);
		const callback = vi.fn();

		debouncer.schedule('a', callback);
		debouncer.schedule('b', callback);
		debouncer.dispose();
		vi.advanceTimersByTime(200);

		expect(callback).not.toHaveBeenCalled();
	});
});
