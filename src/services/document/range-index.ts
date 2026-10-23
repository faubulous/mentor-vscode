import { Range } from 'vscode-languageserver-types';

/**
 * The slots of one chunk: start line, start character, end line, end character
 * and the index of the next chunk of the same key.
 */
const SLOTS_PER_CHUNK = 5;
const NEXT_SLOT = 4;
const END_OF_CHAIN = 0xFFFFFFFF;
const INITIAL_CHUNK_CAPACITY = 64;

/**
 * Chunk indices are packed as `head * CHAIN_FACTOR + tail` into one number per
 * key, which keeps the per-key bookkeeping to a single map entry. 2^26 chunks
 * per index is far beyond any document; the product stays a safe integer.
 */
const CHAIN_FACTOR = 2 ** 26;

/**
 * Maps keys, such as IRIs or blank node identifiers, to the ranges where they
 * occur in a document. A document index holds one entry per token occurrence,
 * so the storage is kept dense: the ranges of all keys live in one typed array
 * of fixed-size chunks that are chained per key, and each key costs one map
 * entry. Compared with a `Range` object per occurrence this is about an order
 * of magnitude less memory across a workspace. `Range` objects are created on
 * demand when ranges are read, so lookups by key stay O(1).
 */
export class RangeIndex {
	private readonly _chains = new Map<string, number>();

	private _chunks = new Uint32Array(INITIAL_CHUNK_CAPACITY * SLOTS_PER_CHUNK);

	private _chunkCount = 0;

	/**
	 * The number of keys in the index.
	 */
	get size(): number {
		return this._chains.size;
	}

	/**
	 * Creates an index from a plain record of ranges, as produced by parsers and used in tests.
	 * @param record The ranges per key.
	 * @returns A new index holding the same ranges.
	 */
	static fromRecord(record: Record<string, Range[]>): RangeIndex {
		const index = new RangeIndex();

		for (const [key, ranges] of Object.entries(record)) {
			for (const range of ranges) {
				index.add(key, range);
			}
		}

		return index;
	}

	/**
	 * The keys in the index, in insertion order.
	 */
	keys(): IterableIterator<string> {
		return this._chains.keys();
	}

	/**
	 * Indicates whether at least one range is recorded for a key.
	 * @param key The key.
	 */
	has(key: string): boolean {
		return this._chains.has(key);
	}

	/**
	 * The number of ranges recorded for a key; `0` for an unknown key.
	 * @param key The key.
	 */
	count(key: string): number {
		let count = 0;

		for (let chunk = this._headOf(key); chunk !== END_OF_CHAIN; chunk = this._nextOf(chunk)) {
			count++;
		}

		return count;
	}

	/**
	 * The first range recorded for a key, or `undefined` for an unknown key.
	 * @param key The key.
	 */
	first(key: string): Range | undefined {
		const head = this._headOf(key);

		return head === END_OF_CHAIN ? undefined : this._rangeOf(head);
	}

	/**
	 * All ranges recorded for a key, in insertion order; empty for an unknown key.
	 * @param key The key.
	 */
	getRanges(key: string): Range[] {
		const ranges: Range[] = [];

		for (let chunk = this._headOf(key); chunk !== END_OF_CHAIN; chunk = this._nextOf(chunk)) {
			ranges.push(this._rangeOf(chunk));
		}

		return ranges;
	}

	/**
	 * Appends a range to the ranges of a key.
	 * @param key The key.
	 * @param range The range to record.
	 */
	add(key: string, range: Range): void {
		const chain = this._chains.get(key);
		const chunk = this._appendChunk(range);

		if (chain === undefined) {
			this._chains.set(key, chunk * CHAIN_FACTOR + chunk);
		} else {
			const head = Math.floor(chain / CHAIN_FACTOR);
			const tail = chain % CHAIN_FACTOR;

			this._chunks[tail * SLOTS_PER_CHUNK + NEXT_SLOT] = chunk;
			this._chains.set(key, head * CHAIN_FACTOR + chunk);
		}
	}

	/**
	 * Replaces the ranges of a key with a single range.
	 * @param key The key.
	 * @param range The range to record.
	 */
	set(key: string, range: Range): void {
		const head = this._headOf(key);

		if (head === END_OF_CHAIN) {
			this.add(key, range);
		} else {
			// Reuse the first chunk and cut the chain; chunks further down are only
			// reclaimed by clear(), which is fine for the rare repeated set.
			this._writeChunk(head, range);
			this._chains.set(key, head * CHAIN_FACTOR + head);
		}
	}

	/**
	 * Removes all keys and ranges.
	 */
	clear(): void {
		this._chains.clear();
		this._chunks = new Uint32Array(INITIAL_CHUNK_CAPACITY * SLOTS_PER_CHUNK);
		this._chunkCount = 0;
	}

	/**
	 * Returns the index as a plain record of range arrays.
	 */
	toRecord(): Record<string, Range[]> {
		const record: Record<string, Range[]> = {};

		for (const key of this._chains.keys()) {
			record[key] = this.getRanges(key);
		}

		return record;
	}

	private _headOf(key: string): number {
		const chain = this._chains.get(key);

		return chain === undefined ? END_OF_CHAIN : Math.floor(chain / CHAIN_FACTOR);
	}

	private _nextOf(chunk: number): number {
		return this._chunks[chunk * SLOTS_PER_CHUNK + NEXT_SLOT];
	}

	private _rangeOf(chunk: number): Range {
		const offset = chunk * SLOTS_PER_CHUNK;

		return Range.create(this._chunks[offset], this._chunks[offset + 1], this._chunks[offset + 2], this._chunks[offset + 3]);
	}

	/**
	 * Writes a range into a chunk and terminates the chain there.
	 */
	private _writeChunk(chunk: number, range: Range): void {
		const offset = chunk * SLOTS_PER_CHUNK;

		this._chunks[offset] = range.start.line;
		this._chunks[offset + 1] = range.start.character;
		this._chunks[offset + 2] = range.end.line;
		this._chunks[offset + 3] = range.end.character;
		this._chunks[offset + NEXT_SLOT] = END_OF_CHAIN;
	}

	/**
	 * Appends a new chunk holding the range, growing the storage by doubling.
	 * @returns The index of the new chunk.
	 */
	private _appendChunk(range: Range): number {
		if ((this._chunkCount + 1) * SLOTS_PER_CHUNK > this._chunks.length) {
			const grown = new Uint32Array(this._chunks.length * 2);

			grown.set(this._chunks);

			this._chunks = grown;
		}

		const chunk = this._chunkCount++;

		this._writeChunk(chunk, range);

		return chunk;
	}
}
