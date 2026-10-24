import { describe, it, expect, vi, afterEach } from 'vitest';
import { getHeapUsedMb } from '@src/utilities/runtime';

describe('getHeapUsedMb', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('reports the used heap of the process in whole megabytes', () => {
		vi.spyOn(process, 'memoryUsage').mockReturnValue({ heapUsed: 3 * 1024 * 1024 + 400 * 1024 } as NodeJS.MemoryUsage);

		expect(getHeapUsedMb()).toBe(3);
	});

	it('returns undefined when the process API is not available', () => {
		const processWithOptionalApi = process as unknown as { memoryUsage?: typeof process.memoryUsage };
		const originalMemoryUsage = processWithOptionalApi.memoryUsage;

		processWithOptionalApi.memoryUsage = undefined;

		try {
			expect(getHeapUsedMb()).toBeUndefined();
		} finally {
			processWithOptionalApi.memoryUsage = originalMemoryUsage;
		}
	});
});
