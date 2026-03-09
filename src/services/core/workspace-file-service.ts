import * as vscode from 'vscode';
import { Utils } from 'vscode-uri';
import { DocumentFactory } from '../document/document-factory';
import { IWorkspaceFileService, WorkspaceFileChangeEvent } from './workspace-file-service.interface';
import { getConfig } from '@src/utilities/config';

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
	 * Indicates if file discovery has completed.
	 */
	private _initialized = false;

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
		private readonly documentFactory: DocumentFactory
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
	 */
	async discoverFiles(): Promise<void> {
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

		vscode.commands.executeCommand('setContext', 'mentor.workspace.isEmpty', this._files.length === 0);
		vscode.commands.executeCommand('setContext', 'mentor.workspace.isInitializing', false);

		this._initialized = true;
		this._onDidFinishDiscovery.fire();
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
				const subFolderUri = vscode.Uri.joinPath(folderUri, subFolderName);

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
		for (const pattern of getConfig().get<string[]>('index.ignoreFolders', [])) {
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
