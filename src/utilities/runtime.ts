const BYTES_PER_MEGABYTE = 1024 * 1024;

/**
 * Returns the heap currently used by the extension host process in megabytes,
 * or `undefined` where the Node.js process API is not available, as in the
 * browser extension host.
 */
export function getHeapUsedMb(): number | undefined {
	if (typeof process === 'undefined' || typeof process.memoryUsage !== 'function') {
		return undefined;
	}

	return Math.round(process.memoryUsage().heapUsed / BYTES_PER_MEGABYTE);
}
