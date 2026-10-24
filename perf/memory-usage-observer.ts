const BYTES_PER_MEGABYTE = 1024 * 1024;

/**
 * One measured phase of the harness.
 */
export interface PhaseResult {
	phase: string;
	files: number;
	quads: number;
	ms: number;
	/** Heap growth still present after a forced garbage collection. */
	retainedMb: number;
	/** Heap growth right after the phase, before the collection: allocation churn. */
	unCollectedMb: number;
	perFileKb: number;
}

/**
 * Measures the duration and heap growth of phases of work and reports them.
 * Each phase runs between two forced garbage collections, so the result
 * separates the memory a phase retains from the memory it only allocates.
 * Requires node to run with `--expose-gc`.
 */
export class MemoryUsageObserver {
	private readonly _results: PhaseResult[] = [];

	/**
	 * Runs one phase between two forced collections and records its cost.
	 * @param phase The name of the phase.
	 * @param files The number of files the phase processes.
	 * @param quads The number of quads the phase processes.
	 * @param run The work of the phase.
	 * @returns The result of the phase.
	 * @throws If node does not expose the garbage collector.
	 */
	async measure(phase: string, files: number, quads: number, run: () => Promise<void> | void): Promise<PhaseResult> {
		this._forceGarbageCollection();

		const heapBefore = this._getHeapUsedMb();
		const start = performance.now();

		await run();

		const ms = performance.now() - start;
		const unCollectedMb = this._getHeapUsedMb() - heapBefore;

		this._forceGarbageCollection();

		const retainedMb = this._getHeapUsedMb() - heapBefore;
		const perFileKb = files > 0 ? retainedMb * 1024 / files : 0;
		const result = { phase, files, quads, ms, retainedMb, unCollectedMb, perFileKb };

		this._results.push(result);

		return result;
	}

	/**
	 * Writes the results as a table and as one `PERF {...}` JSON line per phase
	 * to stdout, so that runs can be compared by script.
	 */
	printResults(): void {
		const header = ['phase', 'files', 'quads', 'ms', 'retainedMb', 'unCollectedMb', 'perFileKb'];
		const rows = this._results.map(result => [
			result.phase,
			String(result.files),
			String(result.quads),
			result.ms.toFixed(0),
			result.retainedMb.toFixed(1),
			result.unCollectedMb.toFixed(1),
			result.perFileKb.toFixed(0)
		]);
		const widths = header.map((title, column) => Math.max(title.length, ...rows.map(row => row[column].length)));
		const formatRow = (row: string[]) => row.map((cell, column) => cell.padEnd(widths[column])).join('  ');

		process.stdout.write('\n' + formatRow(header) + '\n');

		for (const row of rows) {
			process.stdout.write(formatRow(row) + '\n');
		}

		for (const result of this._results) {
			process.stdout.write('PERF ' + JSON.stringify(result) + '\n');
		}
	}

	/**
	 * Forces a full garbage collection.
	 * @throws If node does not expose the garbage collector.
	 */
	private _forceGarbageCollection(): void {
		if (typeof global.gc !== 'function') {
			throw new Error('The harness needs --expose-gc; run it with `npm run perf`.');
		}

		global.gc();
	}

	/**
	 * Returns the used heap in megabytes.
	 */
	private _getHeapUsedMb(): number {
		return process.memoryUsage().heapUsed / BYTES_PER_MEGABYTE;
	}
}
