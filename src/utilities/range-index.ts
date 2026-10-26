import { Range } from 'vscode-languageserver-types';

/**
 * The slots of one chunk: start line, start character, end line, end character
 * and the index of the next chunk of the same key.
 */
const SLOTS_PER_CHUNK = 5;
const NEXT_SLOT = 4;
const END_OF_CHAIN = 0xFFFFFFFF;
const INITIAL_CHUNK_CAPACITY = 64;
const INITIAL_KEY_CAPACITY = 16;

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
	/**
	 * The number of each key, which indexes the first and the last chunk of its chain.
	 * Appending a range to a known key thus takes a single map lookup.
	 */
	private readonly _keyNumbers = new Map<string, number>();

	private _heads = new Uint32Array(INITIAL_KEY_CAPACITY);

	private _tails = new Uint32Array(INITIAL_KEY_CAPACITY);

	private _chunks = new Uint32Array(INITIAL_CHUNK_CAPACITY * SLOTS_PER_CHUNK);

	private _chunkCount = 0;

	/**
	 * The number of keys in the index.
	 */
	get size(): number {
		return this._keyNumbers.size;
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
		return this._keyNumbers.keys();
	}

	/**
	 * Indicates whether at least one range is recorded for a key.
	 * @param key The key.
	 */
	has(key: string): boolean {
		return this._keyNumbers.has(key);
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
		const keyNumber = this._keyNumbers.get(key);
		const chunk = this._appendChunk(range);

		if (keyNumber === undefined) {
			this._addKey(key, chunk);
		} else {
			this._chunks[this._tails[keyNumber] * SLOTS_PER_CHUNK + NEXT_SLOT] = chunk;
			this._tails[keyNumber] = chunk;
		}
	}

	/**
	 * Replaces the ranges of a key with a single range.
	 * @param key The key.
	 * @param range The range to record.
	 */
	set(key: string, range: Range): void {
		const keyNumber = this._keyNumbers.get(key);

		if (keyNumber === undefined) {
			this._addKey(key, this._appendChunk(range));
		} else {
			// Reuse the first chunk and cut the chain; chunks further down are only
			// reclaimed by clear(), which is fine for the rare repeated set.
			const head = this._heads[keyNumber];

			this._writeChunk(head, range);
			this._tails[keyNumber] = head;
		}
	}

	/**
	 * Removes all keys and ranges.
	 */
	clear(): void {
		this._keyNumbers.clear();
		this._heads = new Uint32Array(INITIAL_KEY_CAPACITY);
		this._tails = new Uint32Array(INITIAL_KEY_CAPACITY);
		this._chunks = new Uint32Array(INITIAL_CHUNK_CAPACITY * SLOTS_PER_CHUNK);
		this._chunkCount = 0;
	}

	/**
	 * Returns the index as a plain record of range arrays.
	 */
	toRecord(): Record<string, Range[]> {
		const record: Record<string, Range[]> = {};

		for (const key of this._keyNumbers.keys()) {
			record[key] = this.getRanges(key);
		}

		return record;
	}

	private _headOf(key: string): number {
		const keyNumber = this._keyNumbers.get(key);

		return keyNumber === undefined ? END_OF_CHAIN : this._heads[keyNumber];
	}

	/**
	 * Adds a key whose chain consists of a single chunk, growing the storage by doubling.
	 * @param key The key.
	 * @param chunk The index of the chunk.
	 */
	private _addKey(key: string, chunk: number): void {
		const keyNumber = this._keyNumbers.size;

		if (keyNumber >= this._heads.length) {
			this._heads = this._grow(this._heads);
			this._tails = this._grow(this._tails);
		}

		this._keyNumbers.set(key, keyNumber);
		this._heads[keyNumber] = chunk;
		this._tails[keyNumber] = chunk;
	}

	/**
	 * Returns a copy of an array with twice its length.
	 * @param array The array to grow.
	 */
	private _grow(array: Uint32Array<ArrayBuffer>): Uint32Array<ArrayBuffer> {
		const grown = new Uint32Array(array.length * 2);

		grown.set(array);

		return grown;
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
			this._chunks = this._grow(this._chunks);
		}

		const chunk = this._chunkCount++;

		this._writeChunk(chunk, range);

		return chunk;
	}
}
