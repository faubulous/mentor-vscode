import * as vscode from 'vscode';
import { NotSupportedError } from '@src/utilities/error';
import { SettingsFileStore } from '@src/services/core';
import { UserUri } from './user-uri';

const encoder = new TextEncoder();

/**
 * Provides the settings-backed `user:///` virtual file system.
 *
 * Each registered virtual folder is backed by a {@link SettingsFileStore},
 * i.e. a map-typed Mentor settings key in the user scope — e.g.
 * `user:///shapes/my-shapes.ttl` is the entry `my-shapes.ttl` of
 * `mentor.shacl.shapes`. Files under this scheme therefore sync across
 * machines via Settings Sync and exist independently of any workspace.
 *
 * Adding a new settings-backed content family is a single
 * {@link registerFolder} call with its own settings key. Folders must be
 * registered (in the service container setup) before the provider is
 * constructed, so their change events are relayed to open editors.
 */
export class UserFileSystemProvider implements vscode.FileSystemProvider {
	private static readonly _folders = new Map<string, SettingsFileStore>();

	/**
	 * Registers a virtual folder served from a settings-backed file store.
	 * @param folder The folder path, e.g. `/shapes`.
	 * @param store The settings-backed store holding the folder's files.
	 */
	static registerFolder(folder: string, store: SettingsFileStore): void {
		UserFileSystemProvider._folders.set(UserFileSystemProvider._normalizeFolder(folder), store);
	}

	/**
	 * Returns the store backing a registered virtual folder.
	 */
	static getStore(folder: string): SettingsFileStore | undefined {
		return UserFileSystemProvider._folders.get(UserFileSystemProvider._normalizeFolder(folder));
	}

	private static _normalizeFolder(folder: string): string {
		return folder.startsWith('/') ? folder : `/${folder}`;
	}

	private readonly _onDidChangeFile = new vscode.EventEmitter<vscode.FileChangeEvent[]>();

	readonly onDidChangeFile = this._onDidChangeFile.event;

	constructor(context: vscode.ExtensionContext) {
		// Self-register with the extension context for automatic disposal.
		context.subscriptions.push(
			vscode.workspace.registerFileSystemProvider(UserUri.uriScheme, this, {
				isCaseSensitive: true,
				isReadonly: false
			})
		);

		// Relay store change events as file change events. The stores observe the
		// backing settings values, so local writes AND cross-machine Settings Sync
		// updates both surface here and refresh open editors.
		for (const [folder, store] of UserFileSystemProvider._folders) {
			const toUri = (key: string) => vscode.Uri.parse(UserUri.forFile(folder, key));

			context.subscriptions.push(store.onDidChangeEntries(e => {
				this._onDidChangeFile.fire([
					...e.created.map(key => ({ type: vscode.FileChangeType.Created, uri: toUri(key) })),
					...e.changed.map(key => ({ type: vscode.FileChangeType.Changed, uri: toUri(key) })),
					...e.deleted.map(key => ({ type: vscode.FileChangeType.Deleted, uri: toUri(key) })),
				]);
			}));
		}
	}

	/**
	 * Resolves a URI to its registered folder store and entry key.
	 * @throws FileNotFound when the URI does not point into a registered folder.
	 */
	private _resolveFile(uri: vscode.Uri): { store: SettingsFileStore; key: string } {
		for (const [folder, store] of UserFileSystemProvider._folders) {
			if (uri.path.startsWith(`${folder}/`)) {
				return { store, key: uri.path.slice(folder.length + 1) };
			}
		}

		throw vscode.FileSystemError.FileNotFound(uri);
	}

	async stat(uri: vscode.Uri): Promise<vscode.FileStat> {
		if (uri.path === '/' || UserFileSystemProvider._folders.has(uri.path)) {
			return { type: vscode.FileType.Directory, ctime: 0, mtime: 0, size: 0 };
		}

		const { store, key } = this._resolveFile(uri);

		if (!store.has(key)) {
			throw vscode.FileSystemError.FileNotFound(uri);
		}

		const content = await store.read(key);

		return {
			type: vscode.FileType.File,
			ctime: 0,
			// Bumped by the store whenever the backing settings value changes, so
			// editors detect external (e.g. Settings Sync) updates.
			mtime: store.mtime(key),
			size: encoder.encode(content).length,
		};
	}

	async readFile(uri: vscode.Uri): Promise<Uint8Array> {
		const { store, key } = this._resolveFile(uri);

		if (!store.has(key)) {
			throw vscode.FileSystemError.FileNotFound(uri);
		}

		return encoder.encode(await store.read(key));
	}

	async writeFile(uri: vscode.Uri, content: Uint8Array): Promise<void> {
		const { store, key } = this._resolveFile(uri);

		try {
			// The store observes the resulting configuration change and reports it
			// through onDidChangeEntries, which is relayed as the file change event —
			// one event path for local writes and synced updates alike.
			await store.write(key, new TextDecoder().decode(content));
		} catch (error) {
			throw vscode.FileSystemError.Unavailable(error instanceof Error ? error.message : String(error));
		}
	}

	async delete(uri: vscode.Uri): Promise<void> {
		const { store, key } = this._resolveFile(uri);

		if (!store.has(key)) {
			throw vscode.FileSystemError.FileNotFound(uri);
		}

		await store.delete(key);
	}

	async rename(oldUri: vscode.Uri, newUri: vscode.Uri): Promise<void> {
		const source = this._resolveFile(oldUri);
		const target = this._resolveFile(newUri);

		if (source.store !== target.store) {
			// Folders are backed by different settings keys; moving between them is not supported.
			throw new NotSupportedError();
		}

		if (!source.store.has(source.key)) {
			throw vscode.FileSystemError.FileNotFound(oldUri);
		}

		await source.store.rename(source.key, target.key);
	}

	readDirectory(uri: vscode.Uri): [string, vscode.FileType][] {
		if (uri.path === '/') {
			return [...UserFileSystemProvider._folders.keys()].map(folder => [folder.slice(1), vscode.FileType.Directory]);
		}

		const store = UserFileSystemProvider._folders.get(uri.path);

		if (!store) {
			throw vscode.FileSystemError.FileNotFound(uri);
		}

		return store.keys().map(key => [key, vscode.FileType.File]);
	}

	createDirectory(): void {
		throw new NotSupportedError();
	}

	watch(): vscode.Disposable {
		return new vscode.Disposable(() => { });
	}
}
