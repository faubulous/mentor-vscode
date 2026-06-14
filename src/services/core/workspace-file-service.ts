import * as vscode from 'vscode';
import picomatch from 'picomatch';
import { Utils } from 'vscode-uri';
import { IDocumentFactory } from '../document/document-factory.interface';
import { IWorkspaceFileService, WorkspaceFileChangeEvent } from './workspace-file-service.interface';
import { WorkspaceUri } from '@src/providers/workspace-uri';
import { getConfig } from '@src/utilities/vscode/config';

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
	 * Event emitter for discovery completion.
	 */
	private readonly _onDidFinishDiscovery = new vscode.EventEmitter<void>();

	/**
	 * Event emitter for file changes.
	 */
	private readonly _onDidChangeFiles = new vscode.EventEmitter<WorkspaceFileChangeEvent>();

	/**
	 * An event that is fired when file discovery has completed.
	 */
	readonly onDidFinishDiscovery = this._onDidFinishDiscovery.event;

	/**
	 * An event that is fired when workspace file contents change.
	 */
	readonly onDidChangeFiles = this._onDidChangeFiles.event;

	constructor(
		private readonly documentFactory: IDocumentFactory
	) {
		this._includePatterns = Object.keys(documentFactory.supportedExtensions).map(ext => `**/*${ext}`);

		this._watcher = vscode.workspace.createFileSystemWatcher('**/*', false, false, false);

		this._watcher.onDidCreate((uri: vscode.Uri) => {
			if (!documentFactory.isSupportedFile(uri)) {
				return;
			}

			this._files.push(uri);

			this._onDidChangeFiles.fire({
				type: vscode.FileChangeType.Created,
				uri: Utils.dirname(uri)
			});
		});

		this._watcher.onDidDelete((uri: vscode.Uri) => {
			if (!documentFactory.isSupportedFile(uri)) {
				return;
			}

			this._files = this._files.filter(f => f.path !== uri.path);

			this._onDidChangeFiles.fire({
				type: vscode.FileChangeType.Deleted,
				uri: Utils.dirname(uri)
			});
		});

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

		for (const { oldUri, newUri } of renames) {
			const oldPrefix = oldUri.path + '/';

			this._files = this._files.flatMap((file) => {
				if (file.path === oldUri.path) {
					// The renamed item is a tracked file.
					if (this.documentFactory.isSupportedFile(newUri)) {
						return [newUri];
					}

					// Renamed to an unsupported extension; drop it from the list.
					return [];
				}

				if (file.path.startsWith(oldPrefix)) {
					// The file lives inside a renamed folder; rewrite its path prefix.
					return [file.with({ path: newUri.path + file.path.substring(oldUri.path.length) })];
				}

				return [file];
			});

			// A file renamed from an unsupported extension is not yet tracked, so add it.
			if (this.documentFactory.isSupportedFile(newUri) && !this._files.some(f => f.path === newUri.path)) {
				this._files.push(newUri);
			}

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

		this._files = [];

		for (const folder of vscode.workspace.workspaceFolders ?? []) {
			const workspaceUri = folder.uri;

			const excludePatterns = await this.getExcludePatterns(workspaceUri);

			// Get the excluded folders pattern relative to the workspace folder.
			const excludedFolders = new vscode.RelativePattern(workspaceUri, '{' + excludePatterns.join(',') + '}');

			// Get the included files relative to the workspace folder.
			const includedFiles = new vscode.RelativePattern(workspaceUri, '{' + this._includePatterns.join(',') + '}');

			// Find all matching files.
			const files = await vscode.workspace.findFiles(includedFiles, excludedFolders);

			// Filter to ensure only files ending with supported extensions (glob may match mid-path).
			const filteredFiles = files.filter(uri => this.documentFactory.isSupportedFile(uri));

			this._files.push(...filteredFiles);
		}

		// Apply the configured exclude globs as a monorepo-root-relative filter.
		// The per-folder `findFiles` exclude above only matches folder-relative
		// patterns (e.g. the `**/node_modules/**` defaults); subproject-scoped
		// patterns like `mentor-rdf-parsers/src/n3/**` are resolved here, in the
		// same path space the indexer uses for include matching.
		this._files = this._applyExcludeGlobs(this._files);

		vscode.commands.executeCommand('setContext', 'mentor.workspace.isEmpty', this._files.length === 0);
		vscode.commands.executeCommand('setContext', 'mentor.workspace.isInitializing', false);

		this._initialized = true;
		this._onDidFinishDiscovery.fire();
	}

	/**
	 * Removes files whose monorepo-root-relative path matches any of the
	 * configured `index.excludeFiles` glob patterns.
	 * @param files The discovered files to filter.
	 * @returns The files that are not excluded.
	 */
	private _applyExcludeGlobs(files: vscode.Uri[]): vscode.Uri[] {
		const patterns = getConfig().get<string[]>('index.excludeFiles', [])
			.map(p => p.trim().replace(/\\/g, '/').replace(/^\.?\/+/, ''))
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

			const relativePath = workspaceUri.path.replace(/^\/+/, '');

			return !isExcluded(relativePath);
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

		const folder = folderUri.toString();

		for (const file of this._files) {
			if (!file.toString().startsWith(folder)) {
				continue;
			}

			const relativePath = file.toString().substring(folder.length + 1);

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
		this._watcher.dispose();
		this._renameSubscription.dispose();
		this._onDidFinishDiscovery.dispose();
		this._onDidChangeFiles.dispose();
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
