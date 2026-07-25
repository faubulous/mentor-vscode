import * as vscode from 'vscode';
import { SettingsFileStore } from '@src/services/core';
import { UserUri } from './user-uri';
import { getErrorMessage } from '@src/utilities/error';

const encoder = new TextEncoder();

/**
 * Provides the settings-backed `user:///` virtual file system.
 *
 * All files live in a single {@link SettingsFileStore} — the map-typed
 * `mentor.files` settings key in the user scope — keyed by their full,
 * slash-delimited virtual path. The URI path maps one-to-one to the store key:
 * `user:///shapes/my-shapes.ttl` is the entry `shapes/my-shapes.ttl`. Folders
 * are not stored; intermediate directories are synthesized from the key
 * prefixes. Files under this scheme therefore sync across machines via Settings
 * Sync and exist independently of any workspace.
 */
export class UserFileSystemProvider implements vscode.FileSystemProvider {
	private readonly _onDidChangeFile = new vscode.EventEmitter<vscode.FileChangeEvent[]>();

	readonly onDidChangeFile = this._onDidChangeFile.event;

	constructor(context: vscode.ExtensionContext, private readonly _store: SettingsFileStore) {
		// Self-register with the extension context for automatic disposal.
		context.subscriptions.push(
			vscode.workspace.registerFileSystemProvider(UserUri.uriScheme, this, {
				isCaseSensitive: true,
				isReadonly: false
			})
		);

		// Relay store change events as file change events. The store observes the
		// backing settings value, so local writes AND cross-machine Settings Sync
		// updates both surface here and refresh open editors.
		const toUri = (key: string) => vscode.Uri.parse(UserUri.forPath(key));

		context.subscriptions.push(this._store.onDidChangeEntries(e => {
			this._onDidChangeFile.fire([
				...e.created.map(key => ({ type: vscode.FileChangeType.Created, uri: toUri(key) })),
				...e.changed.map(key => ({ type: vscode.FileChangeType.Changed, uri: toUri(key) })),
				...e.deleted.map(key => ({ type: vscode.FileChangeType.Deleted, uri: toUri(key) })),
			]);
		}));
	}

	/**
	 * Resolves a URI to its store entry key (the path without the leading slash).
	 */
	private _key(uri: vscode.Uri): string {
		return uri.path.replace(/^\/+/, '');
	}

	/**
	 * Indicates whether any stored file lives under the given directory key,
	 * i.e. whether the key names a (synthesized) directory.
	 */
	private _isDirectory(key: string): boolean {
		const prefix = `${key}/`;

		return this._store.keys().some(k => k.startsWith(prefix));
	}

	async stat(uri: vscode.Uri): Promise<vscode.FileStat> {
		const key = this._key(uri);

		if (key === '') {
			return { type: vscode.FileType.Directory, ctime: 0, mtime: 0, size: 0 };
		}

		if (this._store.has(key)) {
			const content = await this._store.read(key);

			return {
				type: vscode.FileType.File,
				ctime: 0,
				// Bumped by the store whenever the backing settings value changes, so
				// editors detect external (e.g. Settings Sync) updates.
				mtime: this._store.mtime(key),
				size: encoder.encode(content).length,
			};
		}

		if (this._isDirectory(key)) {
			return { type: vscode.FileType.Directory, ctime: 0, mtime: 0, size: 0 };
		}

		throw vscode.FileSystemError.FileNotFound(uri);
	}

	async readFile(uri: vscode.Uri): Promise<Uint8Array> {
		const key = this._key(uri);

		if (!this._store.has(key)) {
			throw vscode.FileSystemError.FileNotFound(uri);
		}

		return encoder.encode(await this._store.read(key));
	}

	async writeFile(uri: vscode.Uri, content: Uint8Array): Promise<void> {
		try {
			// The store observes the resulting configuration change and reports it
			// through onDidChangeEntries, which is relayed as the file change event —
			// one event path for local writes and synced updates alike.
			await this._store.write(this._key(uri), new TextDecoder().decode(content));
		} catch (error) {
			throw vscode.FileSystemError.Unavailable(getErrorMessage(error));
		}
	}

	async delete(uri: vscode.Uri): Promise<void> {
		const key = this._key(uri);

		if (!this._store.has(key)) {
			throw vscode.FileSystemError.FileNotFound(uri);
		}

		await this._store.delete(key);
	}

	async rename(oldUri: vscode.Uri, newUri: vscode.Uri): Promise<void> {
		const source = this._key(oldUri);

		if (!this._store.has(source)) {
			throw vscode.FileSystemError.FileNotFound(oldUri);
		}

		await this._store.rename(source, this._key(newUri));
	}

	readDirectory(uri: vscode.Uri): [string, vscode.FileType][] {
		const key = this._key(uri);
		const prefix = key === '' ? '' : `${key}/`;

		// Directories are synthesized from key prefixes: for each stored key under
		// the directory, take the next path segment; a segment that completes a key
		// is a file, otherwise it names a subdirectory.
		const entries = new Map<string, vscode.FileType>();

		for (const storeKey of this._store.keys()) {
			if (!storeKey.startsWith(prefix)) {
				continue;
			}

			const remainder = storeKey.slice(prefix.length);
			const slash = remainder.indexOf('/');

			if (slash === -1) {
				entries.set(remainder, vscode.FileType.File);
			} else {
				const segment = remainder.slice(0, slash);

				if (!entries.has(segment)) {
					entries.set(segment, vscode.FileType.Directory);
				}
			}
		}

		if (entries.size === 0 && key !== '' && !this._isDirectory(key)) {
			throw vscode.FileSystemError.FileNotFound(uri);
		}

		return [...entries];
	}

	createDirectory(): void {
		// Folders are implicit in the flat store: a directory materializes as soon
		// as a file is written under its path. Nothing to persist.
	}

	watch(): vscode.Disposable {
		return new vscode.Disposable(() => { });
	}
}
