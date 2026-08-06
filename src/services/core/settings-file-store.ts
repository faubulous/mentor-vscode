import * as vscode from 'vscode';
import { getConfig } from '@src/utilities/vscode/config';
import { compressToBase64, decompressFromBase64 } from '@src/utilities/compression';

/**
 * A single file entry in a settings-backed file map.
 */
export interface SettingsFileEntry {
	/**
	 * How the content is encoded. The store always writes `gzip+base64`;
	 * `plain` is tolerated on read so hand-edited or migrated entries keep working.
	 */
	encoding: 'gzip+base64' | 'plain';

	/**
	 * The file content, encoded per {@link encoding}.
	 */
	content: string;

	/**
	 * Managed by Mentor: the workspaces whose validation profiles reference this
	 * file. Present only when at least one workspace references it; used to protect
	 * the file from being offered for deletion in other workspaces.
	 */
	references?: WorkspaceReference[];
}

/**
 * A workspace that references a settings-backed file. The {@link id} is a stable,
 * Mentor-generated workspace id (survives renames); {@link name} is the last-seen
 * display name only.
 */
export interface WorkspaceReference {
	id: string;
	name: string;
}

/**
 * Compares two reference lists for equality (order-sensitive, by id and name).
 */
function referencesEqual(a: WorkspaceReference[], b: WorkspaceReference[]): boolean {
	return a.length === b.length && a.every((ref, i) => ref.id === b[i].id && ref.name === b[i].name);
}

/**
 * The change sets reported when the backing settings value changes,
 * as file map keys.
 */
export interface SettingsFileChangeEvent {
	created: string[];
	changed: string[];
	deleted: string[];
}

/**
 * The default maximum length of a single encoded entry. Settings Sync rejects
 * oversized settings payloads wholesale, so entries are gated well below that
 * limit; ~100k base64 characters hold several hundred KB of typical RDF text
 * after compression.
 */
const DEFAULT_MAX_ENTRY_LENGTH = 100_000;

/**
 * Stores file contents inside the *user-level* value of a map-typed Mentor
 * settings key (`mentor.<settingsKey>`), so the files travel with the user's
 * settings via Settings Sync.
 *
 * The store is the single reader/writer of the backing map: file content is
 * gzip-compressed and base64-encoded on write (with a size gate protecting
 * Settings Sync), decoded on read, and external value changes — local writes
 * and cross-machine sync updates alike — are observed through
 * `onDidChangeConfiguration` and reported as per-key change sets via
 * {@link onDidChangeEntries}.
 */
export class SettingsFileStore implements vscode.Disposable {
	private readonly _onDidChangeEntries = new vscode.EventEmitter<SettingsFileChangeEvent>();

	/**
	 * Fires when entries of the backing settings value are created, changed or
	 * deleted — by this store, another part of the extension, a hand edit, or a
	 * Settings Sync update from another machine.
	 */
	readonly onDidChangeEntries = this._onDidChangeEntries.event;

	private readonly _maxEntryLength: number;

	/**
	 * The last observed raw map, used to compute change sets.
	 */
	private _snapshot: Record<string, SettingsFileEntry>;

	/**
	 * Cached backing map. `WorkspaceConfiguration.inspect()` deep-clones the whole
	 * value (including every entry's encoded content) on each call, so reading it
	 * per `keys()`/`has()`/`getReferences()`/`read()` — often in loops — is costly.
	 * The cache holds VS Code's already-frozen clone and is invalidated whenever
	 * the backing value changes (config-change event) or this store writes it.
	 */
	private _cache: Record<string, SettingsFileEntry> | undefined;

	/**
	 * Per-key modification times, bumped whenever a value change is observed.
	 */
	private readonly _mtimes = new Map<string, number>();

	/**
	 * Serializes read-modify-write operations so rapid successive writes
	 * cannot lose entries to interleaved reads.
	 */
	private _writeQueue: Promise<unknown> = Promise.resolve();

	private readonly _disposables: vscode.Disposable[] = [];

	/**
	 * @param settingsKey The bare Mentor settings key holding the file map, e.g. `files`.
	 * @param options Optional overrides; `maxEntryLength` bounds the encoded size of a single entry.
	 */
	constructor(readonly settingsKey: string, options?: { maxEntryLength?: number }) {
		this._maxEntryLength = options?.maxEntryLength ?? DEFAULT_MAX_ENTRY_LENGTH;
		this._snapshot = this._readMap();

		this._disposables.push(vscode.workspace.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration(`mentor.${this.settingsKey}`)) {
				this._handleConfigurationChange();
			}
		}));
	}

	/**
	 * The file names currently present in the map.
	 */
	keys(): string[] {
		return Object.keys(this._readMap());
	}

	/**
	 * Indicates whether a file entry exists.
	 */
	has(key: string): boolean {
		return key in this._readMap();
	}

	/**
	 * Returns the decoded content of a file entry.
	 * @throws When the entry does not exist or its content cannot be decoded.
	 */
	async read(key: string): Promise<string> {
		const entry = this._readMap()[key];

		if (!entry) {
			throw new Error(`No entry '${key}' in mentor.${this.settingsKey}.`);
		}

		// Tolerant reader: only gzip+base64 needs decoding; anything else is
		// treated as plain text so hand-authored entries keep working.
		return entry.encoding === 'gzip+base64'
			? decompressFromBase64(entry.content)
			: entry.content;
	}

	/**
	 * Writes a file entry, replacing any existing content. The content is
	 * always stored gzip-compressed and base64-encoded.
	 * @throws When the encoded entry exceeds the size gate.
	 */
	async write(key: string, content: string): Promise<void> {
		const encoded = await compressToBase64(content);

		if (encoded.length > this._maxEntryLength) {
			throw new Error(
				`The file '${key}' is too large to be stored in the user settings ` +
				`(Settings Sync limits the settings size). Keep large files in the workspace instead.`
			);
		}

		await this._mutateMap(map => {
			// Merge so Mentor-managed metadata (e.g. references) survives a content edit.
			map[key] = { ...map[key], encoding: 'gzip+base64', content: encoded };
		});
	}

	/**
	 * The workspace references recorded for a file entry (empty when none).
	 */
	getReferences(key: string): WorkspaceReference[] {
		return this._readMap()[key]?.references ?? [];
	}

	/**
	 * Applies workspace-reference updates to existing entries in a single write.
	 * A non-empty list is stored as the entry's `references`; an empty list clears
	 * the field. Keys without a backing entry are skipped (deleted files are never
	 * resurrected). Does nothing when no update actually changes the stored value.
	 * @param refsByKey The new reference lists, keyed by file entry key.
	 */
	async setReferences(refsByKey: Record<string, WorkspaceReference[]>): Promise<void> {
		const map = this._readMap();

		const changed = Object.entries(refsByKey).some(([key, refs]) => {
			const entry = map[key];

			return entry ? !referencesEqual(refs, entry.references ?? []) : false;
		});

		if (!changed) {
			return;
		}

		await this._mutateMap(next => {
			for (const [key, refs] of Object.entries(refsByKey)) {
				const entry = next[key];

				if (!entry) {
					continue;
				}

				if (refs.length > 0) {
					next[key] = { ...entry, references: refs };
				} else if (entry.references) {
					const rest = { ...entry };
					delete rest.references;
					next[key] = rest;
				}
			}
		});
	}

	/**
	 * Removes a file entry. Removing a missing entry is a no-op.
	 */
	async delete(key: string): Promise<void> {
		await this._mutateMap(map => {
			delete map[key];
		});
	}

	/**
	 * Renames a file entry, keeping its stored content unchanged.
	 * @throws When the source entry does not exist.
	 */
	async rename(oldKey: string, newKey: string): Promise<void> {
		await this._mutateMap(map => {
			const entry = map[oldKey];

			if (!entry) {
				throw new Error(`No entry '${oldKey}' in mentor.${this.settingsKey}.`);
			}

			delete map[oldKey];
			map[newKey] = entry;
		});
	}

	/**
	 * Returns the modification time observed for a file entry, or `0` when no
	 * change has been observed in this session.
	 */
	mtime(key: string): number {
		return this._mtimes.get(key) ?? 0;
	}

	dispose(): void {
		for (const disposable of this._disposables) {
			disposable.dispose();
		}

		this._onDidChangeEntries.dispose();
	}

	/**
	 * Reads the raw entry map from the user-level settings value. The
	 * workspace-level value is deliberately ignored: settings-backed files are
	 * user-scope by definition.
	 */
	private _readMap(): Record<string, SettingsFileEntry> {
		if (!this._cache) {
			this._cache = getConfig().inspect<Record<string, SettingsFileEntry>>(this.settingsKey)?.globalValue ?? {};
		}

		return this._cache;
	}

	/**
	 * Applies a mutation to a copy of the current map and writes it back to the
	 * user-level settings value, serialized against concurrent mutations.
	 */
	private _mutateMap(mutate: (map: Record<string, SettingsFileEntry>) => void): Promise<void> {
		const operation = async () => {
			const map = { ...this._readMap() };

			mutate(map);

			const value = Object.keys(map).length > 0 ? map : undefined;

			await getConfig().update(this.settingsKey, value, vscode.ConfigurationTarget.Global);

			// The written map is now current; cache it so reads before the resulting
			// config-change event don't re-inspect (deep-clone) the whole value.
			this._cache = value ?? {};
		};

		const result = this._writeQueue.then(operation, operation);

		// Keep the queue alive after failures; the caller still sees the rejection.
		this._writeQueue = result.catch(() => undefined);

		return result;
	}

	/**
	 * Diffs the current map against the last snapshot, bumps the modification
	 * times of changed keys and reports the change sets.
	 */
	private _handleConfigurationChange(): void {
		const previous = this._snapshot;

		// The backing value changed (our own write, a hand edit, or a Settings Sync
		// update) — drop the cache so the fresh value is read.
		this._cache = undefined;

		const next = this._readMap();

		const created: string[] = [];
		const changed: string[] = [];
		const deleted: string[] = [];

		for (const key of Object.keys(next)) {
			const before = previous[key];

			if (!before) {
				created.push(key);
			} else if (before.encoding !== next[key].encoding || before.content !== next[key].content) {
				changed.push(key);
			}
		}

		for (const key of Object.keys(previous)) {
			if (!(key in next)) {
				deleted.push(key);
			}
		}

		this._snapshot = next;

		if (created.length === 0 && changed.length === 0 && deleted.length === 0) {
			return;
		}

		const now = Date.now();

		for (const key of [...created, ...changed]) {
			this._mtimes.set(key, now);
		}

		for (const key of deleted) {
			this._mtimes.delete(key);
		}

		this._onDidChangeEntries.fire({ created, changed, deleted });
	}
}
