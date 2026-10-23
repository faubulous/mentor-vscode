import * as vscode from 'vscode';
import picomatch from 'picomatch';
import { Utils } from 'vscode-uri';
import { IDocumentFactory } from '../document/document-factory.interface';
import { IWorkspaceFileService, WorkspaceFileChangeEvent, WorkspaceFileListChangeEvent } from './workspace-file-service.interface';
import { normalizeGlobPattern } from '@src/utilities/glob';
import { WorkspaceUri } from '@src/providers/workspace-uri';
import { getConfig } from '@src/utilities/vscode/config';
import { isDocumentOpen } from '@src/utilities/vscode/editors';

/**
 * How long created paths that are not supported files are collected before they
 * are checked for folders. Batching lets a folder copy or move that is reported as
 * many create events be handled with a single folder scan.
 */
const CREATED_BATCH_DELAY_MS = 250;

/**
 * Service for discovering and watching workspace files that match supported extensions.
 * Consolidates file discovery logic to avoid duplicate workspace scans.
 */
export class WorkspaceFileService implements IWorkspaceFileService {
	/**
	 * The included file extensions as glob patterns.
	 */
	private readonly _includePatterns: string[];

	/**
	 * A list of all discovered files in the workspace.
	 */
	private _files: vscode.Uri[] = [];

	/**
	 * A file system watcher for the workspace.
	 */
	private readonly _watcher: vscode.FileSystemWatcher;

	/**
	 * Subscription to workspace rename events.
	 */
	private readonly _renameSubscription: vscode.Disposable;

	/**
	 * Indicates if file discovery has completed.
	 */
	private _initialized = false;

	/**
	 * The discovery pass currently in flight, or `undefined` when idle.
	 * Used to serialize concurrent {@link discoverFiles} calls.
	 */
	private _discovering?: Promise<void>;

	/**
	 * Indicates that another discovery pass was requested while one was in flight.
	 */
	private _rediscoverRequested = false;

	/**
	 * Created paths that are not supported files and still need to be checked for folders.
	 */
	private _pendingCreatedUris: vscode.Uri[] = [];

	/**
	 * The timer that processes {@link _pendingCreatedUris}, or `undefined` when none is scheduled.
	 */
	private _createdBatchTimer?: ReturnType<typeof setTimeout>;

	/**
	 * Event emitter for discovery completion.
	 */
	private readonly _onDidFinishDiscovery = new vscode.EventEmitter<void>();

	/**
	 * Event emitter for file changes.
	 */
	private readonly _onDidChangeFiles = new vscode.EventEmitter<WorkspaceFileChangeEvent>();

	/**
	 * Event emitter for changes to the discovered file list.
	 */
	private readonly _onDidChangeFileList = new vscode.EventEmitter<WorkspaceFileListChangeEvent>();

	/**
	 * An event that is fired when file discovery has completed.
	 */
	readonly onDidFinishDiscovery = this._onDidFinishDiscovery.event;

	/**
	 * An event that is fired when workspace file contents change.
	 */
	readonly onDidChangeFiles = this._onDidChangeFiles.event;

	/**
	 * An event that is fired when files are added to, removed from or changed in the discovered file list.
	 */
	readonly onDidChangeFileList = this._onDidChangeFileList.event;

	constructor(
		private readonly documentFactory: IDocumentFactory
	) {
		this._includePatterns = Object.keys(documentFactory.supportedExtensions).map(ext => `**/*${ext}`);

		// Folder operations are reported as a single event for the folder, not one
		// per contained file: deletes of children are coalesced into the folder
		// delete and a folder moved into the workspace is reported as one create.
		this._watcher = vscode.workspace.createFileSystemWatcher('**/*', false, false, false);
		this._watcher.onDidCreate((uri: vscode.Uri) => this._handleCreated(uri));
		this._watcher.onDidChange((uri: vscode.Uri) => this._handleChanged(uri));
		this._watcher.onDidDelete((uri: vscode.Uri) => this._handleDeleted(uri));

		// Programmatic renames (e.g. via `applyEdit`) and folder renames are not
		// reliably surfaced as individual create/delete watcher events, so the
		// rename event is handled explicitly to keep the file list and tree in sync.
		this._renameSubscription = vscode.workspace.onDidRenameFiles((e) => {
			this.handleRenames(e.files);
		});
	}

	/**
	 * Updates the discovered file list in response to file or folder renames and
	 * notifies listeners so the workspace tree reflects the new names.
	 * @param renames The rename events from `vscode.workspace.onDidRenameFiles`.
	 */
	handleRenames(renames: ReadonlyArray<{ readonly oldUri: vscode.Uri; readonly newUri: vscode.Uri }>): void {
		const changedFolders = new Set<string>();
		const added: vscode.Uri[] = [];
		const removed: vscode.Uri[] = [];

		for (const { oldUri, newUri } of renames) {
			this._renameFiles(oldUri, newUri, added, removed);

			// Refresh the folders that gained or lost the renamed item.
			changedFolders.add(Utils.dirname(oldUri).toString());
			changedFolders.add(Utils.dirname(newUri).toString());
		}

		for (const folder of changedFolders) {
			this._onDidChangeFiles.fire({
				type: vscode.FileChangeType.Changed,
				uri: vscode.Uri.parse(folder)
			});
		}

		this._fireFileListChange({ added, removed });
	}

	/**
	 * Applies a single file or folder rename to the discovered file list.
	 * @param oldUri The URI of the renamed file or folder before the rename.
	 * @param newUri The URI of the renamed file or folder after the rename.
	 * @param added Collects the files that were added to the list.
	 * @param removed Collects the files that were removed from the list.
	 */
	private _renameFiles(oldUri: vscode.Uri, newUri: vscode.Uri, added: vscode.Uri[], removed: vscode.Uri[]): void {
		const oldPrefix = oldUri.path + '/';

		const files = this._files.flatMap((file) => {
			if (file.path === oldUri.path) {
				removed.push(file);

				// The renamed item is a tracked file; drop it when renamed to an unsupported extension.
				if (!this.documentFactory.isSupportedFile(newUri)) {
					return [];
				}

				added.push(newUri);

				return [newUri];
			}

			if (file.path.startsWith(oldPrefix)) {
				// The file lives inside a renamed folder; rewrite its path prefix.
				const renamedFile = file.with({ path: newUri.path + file.path.substring(oldUri.path.length) });

				removed.push(file);
				added.push(renamedFile);

				return [renamedFile];
			}

			return [file];
		});

		// A file renamed from an unsupported extension is not yet tracked, so add it.
		if (this.documentFactory.isSupportedFile(newUri) && !files.some(f => f.path === newUri.path)) {
			files.push(newUri);
			added.push(newUri);
		}

		this._setFiles(files);
	}

	/**
	 * Adds a created file, or schedules a created path that may be a folder to be scanned.
	 * @param uri The URI of the created file or folder.
	 */
	private _handleCreated(uri: vscode.Uri): void {
		if (this.documentFactory.isSupportedFile(uri)) {
			this._addFiles([uri]);

			return;
		}

		this._pendingCreatedUris.push(uri);

		// Process the batch at a fixed delay after its first path, so a long stream
		// of create events (e.g. a large copy) cannot postpone it indefinitely.
		if (!this._createdBatchTimer) {
			this._createdBatchTimer = setTimeout(() => {
				this._createdBatchTimer = undefined;

				void this._processCreatedBatch();
			}, CREATED_BATCH_DELAY_MS);
		}
	}

	/**
	 * Scans the created paths that are folders for supported files and adds them to the list.
	 * Only the top-most paths of the batch are checked, so that a copied folder tree
	 * reported as many create events is scanned once.
	 */
	private async _processCreatedBatch(): Promise<void> {
		const createdUris = this._applyExcludeGlobs(this._getTopMostUris(this._pendingCreatedUris.splice(0)));
		const foundFiles: vscode.Uri[] = [];

		for (const uri of createdUris) {
			const workspaceFolder = this._getWorkspaceFolder(uri);

			if (!workspaceFolder || !await this._isFolder(uri)) {
				continue;
			}

			try {
				foundFiles.push(...await this._findFilesIn(uri, workspaceFolder.uri));
			} catch {
				// The folder was removed again before it could be scanned.
			}
		}

		this._addFiles(foundFiles);
	}

	/**
	 * Indicates whether a URI refers to an existing folder.
	 * @param uri The URI to check.
	 * @returns `true` if the URI is a folder, `false` if it is a file or no longer exists.
	 */
	private async _isFolder(uri: vscode.Uri): Promise<boolean> {
		try {
			const stat = await vscode.workspace.fs.stat(uri);

			// The type is a bit mask; a symbolic link to a folder has two bits set.
			return (stat.type & vscode.FileType.Directory) !== 0;
		} catch {
			return false;
		}
	}

	/**
	 * Reports a tracked file whose content was changed on disk, e.g. by a version
	 * control checkout. Changes of open documents are already handled by the editor.
	 * @param uri The URI of the changed file.
	 */
	private _handleChanged(uri: vscode.Uri): void {
		if (!this._files.some(f => f.path === uri.path) || isDocumentOpen(uri)) {
			return;
		}

		this._fireFileListChange({ changed: [uri] });
	}

	/**
	 * Removes a deleted file, or all files inside a deleted folder, from the list.
	 * @param uri The URI of the deleted file or folder.
	 */
	private _handleDeleted(uri: vscode.Uri): void {
		const folderPrefix = uri.path + '/';
		const removed = this._files.filter(f => f.path === uri.path || f.path.startsWith(folderPrefix));

		if (removed.length === 0) {
			return;
		}

		const removedKeys = new Set(removed.map(f => f.toString()));

		this._setFiles(this._files.filter(f => !removedKeys.has(f.toString())));
		this._fireTreeChanges(vscode.FileChangeType.Deleted, removed, this._files);
		this._fireFileListChange({ removed });
	}

	/**
	 * Adds files that are not yet tracked and are not excluded, and notifies listeners.
	 * @param uris The candidate files to add.
	 */
	private _addFiles(uris: vscode.Uri[]): void {
		const trackedKeys = new Set(this._files.map(f => f.toString()));
		const added = this._applyExcludeGlobs(uris).filter(uri => !trackedKeys.has(uri.toString()));

		if (added.length === 0) {
			return;
		}

		const previousFiles = this._files;

		this._setFiles([...previousFiles, ...added]);
		this._fireTreeChanges(vscode.FileChangeType.Created, added, previousFiles);
		this._fireFileListChange({ added });
	}

	/**
	 * Replaces the discovered file list, dropping duplicate entries. Watcher and
	 * rename events for the same operation can arrive in any order, so the same
	 * file may be reported more than once.
	 * @param files The new file list.
	 */
	private _setFiles(files: vscode.Uri[]): void {
		const uniqueFiles = new Map<string, vscode.Uri>();

		for (const file of files) {
			const key = file.toString();

			if (!uniqueFiles.has(key)) {
				uniqueFiles.set(key, file);
			}
		}

		this._files = [...uniqueFiles.values()];
	}

	/**
	 * Fires {@link onDidChangeFileList} if any files were added, removed or changed.
	 * @param change The files that were added, removed or changed.
	 */
	private _fireFileListChange(change: Partial<WorkspaceFileListChangeEvent>): void {
		const event: WorkspaceFileListChangeEvent = {
			added: change.added ?? [],
			removed: change.removed ?? [],
			changed: change.changed ?? []
		};

		if (event.added.length + event.removed.length + event.changed.length > 0) {
			this._onDidChangeFileList.fire(event);
		}
	}

	/**
	 * Fires {@link onDidChangeFiles} for the tree nodes that need to be refreshed after
	 * files were added or removed.
	 * @param type The type of the change.
	 * @param files The files that were added or removed.
	 * @param visibleFiles The file list in which the folders of the tree nodes exist, i.e.
	 * the list before files were added or after files were removed.
	 */
	private _fireTreeChanges(type: vscode.FileChangeType, files: vscode.Uri[], visibleFiles: ReadonlyArray<vscode.Uri>): void {
		const visibleFolders = this._getFolderPaths(visibleFiles);
		const refreshedFolders = new Map<string, vscode.Uri>();

		for (const file of files) {
			const folder = this._getRefreshRoot(Utils.dirname(file), visibleFolders);

			refreshedFolders.set(folder.toString(), folder);
		}

		for (const uri of refreshedFolders.values()) {
			this._onDidChangeFiles.fire({ type, uri });
		}
	}

	/**
	 * Gets the closest folder that is shown in the tree, starting at a given folder. A
	 * folder only has a tree node if it contains files, so when a folder appears or
	 * disappears with its files, its parent node must be refreshed instead.
	 * @param folder The folder of an added or removed file.
	 * @param visibleFolders The paths of all folders that have a tree node.
	 * @returns The folder whose tree node needs to be refreshed.
	 */
	private _getRefreshRoot(folder: vscode.Uri, visibleFolders: ReadonlySet<string>): vscode.Uri {
		let current = folder;

		while (!visibleFolders.has(current.path) && !this._isWorkspaceFolder(current)) {
			const parent = Utils.dirname(current);

			if (parent.path === current.path) {
				break;
			}

			current = parent;
		}

		return current;
	}

	/**
	 * Gets the paths of all folders that contain at least one of the given files.
	 * @param files The files whose folders are collected.
	 * @returns The paths of the folders and all of their ancestors.
	 */
	private _getFolderPaths(files: ReadonlyArray<vscode.Uri>): Set<string> {
		const result = new Set<string>();

		for (const file of files) {
			let folder = Utils.dirname(file);

			while (!result.has(folder.path)) {
				result.add(folder.path);

				const parent = Utils.dirname(folder);

				if (parent.path === folder.path) {
					break;
				}

				folder = parent;
			}
		}

		return result;
	}

	/**
	 * Gets the given URIs without the ones that lie inside another one of them.
	 * @param uris The URIs to reduce.
	 * @returns The top-most URIs, without duplicates.
	 */
	private _getTopMostUris(uris: vscode.Uri[]): vscode.Uri[] {
		// Shorter paths first, so that a folder is always visited before its contents.
		const sorted = [...uris].sort((a, b) => a.path.length - b.path.length);
		const result: vscode.Uri[] = [];

		for (const uri of sorted) {
			const isNested = result.some(r => uri.path === r.path || uri.path.startsWith(r.path + '/'));

			if (!isNested) {
				result.push(uri);
			}
		}

		return result;
	}

	/**
	 * Gets the workspace folder that contains a URI.
	 * @param uri The URI of a file or folder.
	 * @returns The innermost workspace folder containing the URI, or `undefined`.
	 */
	private _getWorkspaceFolder(uri: vscode.Uri): vscode.WorkspaceFolder | undefined {
		const folders = (vscode.workspace.workspaceFolders ?? [])
			.filter(f => uri.path === f.uri.path || uri.path.startsWith(f.uri.path + '/'));

		return folders.sort((a, b) => b.uri.path.length - a.uri.path.length)[0];
	}

	/**
	 * Indicates whether a URI is the root of a workspace folder.
	 * @param uri The URI of a folder.
	 */
	private _isWorkspaceFolder(uri: vscode.Uri): boolean {
		return (vscode.workspace.workspaceFolders ?? []).some(f => f.uri.path === uri.path);
	}

	/**
	 * Get all discovered files in the workspace.
	 */
	get files(): ReadonlyArray<vscode.Uri> {
		return this._files;
	}

	/**
	 * Indicates if file discovery has completed.
	 */
	get initialized(): boolean {
		return this._initialized;
	}

	/**
	 * Get the include patterns for supported file extensions.
	 */
	get includePatterns(): ReadonlyArray<string> {
		return this._includePatterns;
	}

	/**
	 * Discovers all supported files in the workspace.
	 *
	 * Concurrent calls are serialized: while a discovery pass is in flight,
	 * additional requests are coalesced into a single trailing pass. Running
	 * overlapping passes would reset and re-populate the shared file list at the
	 * same time, producing duplicate entries.
	 */
	async discoverFiles(): Promise<void> {
		this._rediscoverRequested = true;

		if (this._discovering) {
			return this._discovering;
		}

		this._discovering = (async () => {
			try {
				while (this._rediscoverRequested) {
					this._rediscoverRequested = false;

					await this._discoverFilesOnce();
				}
			} finally {
				this._discovering = undefined;
			}
		})();

		return this._discovering;
	}

	/**
	 * Performs a single discovery pass, replacing the discovered file list.
	 */
	private async _discoverFilesOnce(): Promise<void> {
		vscode.commands.executeCommand('setContext', 'mentor.workspace.isInitializing', true);
		vscode.commands.executeCommand('setContext', 'mentor.workspace.isEmpty', true);

		const files: vscode.Uri[] = [];

		for (const folder of vscode.workspace.workspaceFolders ?? []) {
			files.push(...await this._findFilesIn(folder.uri, folder.uri));
		}

		// The list is replaced at once, so it stays complete while discovery runs.
		const previousFiles = this._files;

		// Apply the configured exclude globs as a monorepo-root-relative filter.
		// The per-folder `findFiles` exclude only matches folder-relative
		// patterns (e.g. the `**/node_modules/**` defaults); subproject-scoped
		// patterns like `mentor-rdf-parsers/src/n3/**` are resolved here, in the
		// same path space the indexer uses for include matching.
		this._setFiles(this._applyExcludeGlobs(files));

		vscode.commands.executeCommand('setContext', 'mentor.workspace.isEmpty', this._files.length === 0);
		vscode.commands.executeCommand('setContext', 'mentor.workspace.isInitializing', false);

		// A rediscovery recovers from file system changes that were not reported by
		// the watcher, so the differences are reported like watcher changes.
		if (this._initialized) {
			this._reportRediscoveredFiles(previousFiles);
		}

		this._initialized = true;
		this._onDidFinishDiscovery.fire();
	}

	/**
	 * Notifies listeners about the differences between the file list before and after a rediscovery.
	 * @param previousFiles The file list before the rediscovery.
	 */
	private _reportRediscoveredFiles(previousFiles: ReadonlyArray<vscode.Uri>): void {
		const previousKeys = new Set(previousFiles.map(f => f.toString()));
		const currentKeys = new Set(this._files.map(f => f.toString()));

		const added = this._files.filter(f => !previousKeys.has(f.toString()));
		const removed = previousFiles.filter(f => !currentKeys.has(f.toString()));

		if (added.length + removed.length === 0) {
			return;
		}

		for (const folder of vscode.workspace.workspaceFolders ?? []) {
			this._onDidChangeFiles.fire({ type: vscode.FileChangeType.Changed, uri: folder.uri });
		}

		this._fireFileListChange({ added, removed });
	}

	/**
	 * Finds the supported files in a folder, excluding the configured and ignored paths.
	 * @param searchRoot The folder to search in.
	 * @param workspaceUri The workspace folder that contains the search root.
	 * @returns The supported files inside the search root.
	 */
	private async _findFilesIn(searchRoot: vscode.Uri, workspaceUri: vscode.Uri): Promise<vscode.Uri[]> {
		const excludePatterns = await this.getExcludePatterns(workspaceUri);

		// Get the excluded folders pattern relative to the workspace folder.
		const excludedFolders = new vscode.RelativePattern(workspaceUri, '{' + excludePatterns.join(',') + '}');

		// Get the included files relative to the search root.
		const includedFiles = new vscode.RelativePattern(searchRoot, '{' + this._includePatterns.join(',') + '}');

		const files = await vscode.workspace.findFiles(includedFiles, excludedFolders);

		// Filter to ensure only files ending with supported extensions (glob may match mid-path).
		return files.filter(uri => this.documentFactory.isSupportedFile(uri));
	}

	/**
	 * Removes files whose monorepo-root-relative path matches any of the
	 * configured `index.excludeFiles` glob patterns.
	 * @param files The discovered files to filter.
	 * @returns The files that are not excluded.
	 */
	private _applyExcludeGlobs(files: vscode.Uri[]): vscode.Uri[] {
		const patterns = getConfig().get<string[]>('index.excludeFiles', [])
			.map(normalizeGlobPattern)
			.filter(Boolean);

		if (patterns.length === 0) {
			return files;
		}

		const isExcluded = picomatch(patterns, { dot: true });

		return files.filter(uri => {
			const workspaceUri = WorkspaceUri.toWorkspaceUri(uri);

			// Keep files we cannot resolve to a workspace-relative path.
			if (!workspaceUri) {
				return true;
			}

			return !isExcluded(workspaceUri.relativePath);
		});
	}

	/**
	 * Wait for file discovery to complete.
	 */
	async waitForDiscovery(): Promise<void> {
		if (this._initialized) {
			return;
		}

		return new Promise((resolve) => {
			const listener = this._onDidFinishDiscovery.event(() => {
				listener.dispose();
				resolve();
			});
		});
	}

	/**
	 * Generator that yields files matching the given language ID's extensions.
	 * @param languageId The VS Code language identifier (e.g., 'turtle', 'sparql')
	 * @returns Generator yielding matching files one by one.
	 */
	async* getFilesByLanguageId(languageId: string): AsyncGenerator<vscode.Uri, void, unknown> {
		const extensions = await this._getExtensionsForLanguageId(languageId);

		if (extensions.length === 0) {
			return;
		}

		const extSet = new Set<string>(extensions);

		for (const file of this._files) {
			const extension = file.path.split('.').pop() || '';

			if (extSet.has(extension)) {
				yield file;
			}
		}
	}

	/**
	 * Gets file extensions associated with a VS Code language ID.
	 * @param languageId The language identifier
	 * @returns Array of file extensions (without dots)
	 */
	private async _getExtensionsForLanguageId(languageId: string): Promise<string[]> {
		const languages = vscode.extensions.all
			.flatMap(ext => ext.packageJSON?.contributes?.languages || [])
			.filter(lang => lang.id === languageId);

		const extensions: string[] = [];

		for (const language of languages) {
			if (language.extensions) {
				const langExtensions = language.extensions.map((ext: string) =>
					ext.startsWith('.') ? ext.substring(1) : ext
				);
				extensions.push(...langExtensions);
			}
		}

		return [...new Set(extensions)];
	}

	/**
	 * Retrieves the contents of a folder in the workspace.
	 * @param folderUri The URI of the folder to search in.
	 * @returns A list of matching files and folders sorted by type and name.
	 */
	async getFolderContents(folderUri: vscode.Uri): Promise<vscode.Uri[]> {
		const files = [];
		const folders = [];
		const seenFiles = new Set<string>();
		const seenFolders = new Set<string>();

		// Match the folder with a trailing slash, so a sibling folder whose name starts
		// with the same characters (e.g. `old2` next to `old`) is not treated as a child.
		const folder = folderUri.toString();
		const folderPrefix = folder.endsWith('/') ? folder : folder + '/';

		for (const file of this._files) {
			if (!file.toString().startsWith(folderPrefix)) {
				continue;
			}

			const relativePath = file.toString().substring(folderPrefix.length);

			if (relativePath.includes('/')) {
				const subFolderName = relativePath.substring(0, relativePath.indexOf('/'));
				const subFolderUri = vscode.Uri.joinPath(folderUri, decodeURIComponent(subFolderName));

				if (!seenFolders.has(subFolderName)) {
					folders.push(subFolderUri);
					seenFolders.add(subFolderName);
				}
			} else if (!seenFiles.has(relativePath)) {
				files.push(file);
				seenFiles.add(relativePath);
			}
		}

		return [
			...folders.sort((a, b) => a.path.localeCompare(b.path)),
			...files.sort((a, b) => a.path.localeCompare(b.path))
		];
	}

	/**
	 * Disposes of resources held by this service.
	 */
	dispose(): void {
		clearTimeout(this._createdBatchTimer);

		this._createdBatchTimer = undefined;
		this._pendingCreatedUris = [];

		this._watcher.dispose();
		this._renameSubscription.dispose();
		this._onDidFinishDiscovery.dispose();
		this._onDidChangeFiles.dispose();
		this._onDidChangeFileList.dispose();
	}

	/**
	 * Gets the list of patterns to exclude from indexing operations.
	 * @param workspaceUri The workspace URI to get patterns for.
	 * @returns An array of glob patterns to exclude.
	 */
	protected async getExcludePatterns(workspaceUri: vscode.Uri): Promise<string[]> {
		const result = new Set<string>();

		// Add the patterns from the configuration.
		for (const pattern of getConfig().get<string[]>('index.excludeFiles', ['**/.vscode/**', '**/.git/**', '**/node_modules/**'])) {
			result.add(pattern);
		}

		// Add the patterns from the .gitignore file if enabled.
		if (getConfig().get<boolean>('index.useGitIgnore')) {
			const gitignore = vscode.Uri.joinPath(workspaceUri, '.gitignore');

			try {
				const content = await vscode.workspace.fs.readFile(gitignore);

				const excludePatterns = new TextDecoder().decode(content)
					.split('\n')
					.filter(line => !line.startsWith('#') && line.trim() !== '');

				for (const pattern of excludePatterns) {
					result.add(pattern);
				}
			} catch {
				// If the .gitignore file does not exist, ignore it.
			}
		}

		return Array.from(result);
	}
}
