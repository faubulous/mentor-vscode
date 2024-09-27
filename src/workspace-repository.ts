import * as vscode from 'vscode';
import { mentor } from './mentor';
import { Utils } from 'vscode-uri';
import { DocumentFactory } from './document-factory';

/**
 * A repository for retrieving workspace resources such as files and folders.
 */
export class WorkspaceRepository {
	/**
	 * The included file extensions as glob patterns.
	 */
	private _includePatterns: string[] = [];

	/**
	 * The excluded file patterns loaded from the configuration.
	 */
	private _excludePatterns: string[] = [];

	/**
	 * A list of all RDF files in the workspace.
	 */
	private _files: vscode.Uri[] = [];

	/**
	 * A file system watcher for the workspace.
	 */
	readonly watcher = vscode.workspace.createFileSystemWatcher('**/*', false, false, false);

	/**
	 * Indicates if the workspace has been initialized.
	 */
	private _initialized = false;

	/**
	 * An event that is fired when the workspace has been initialized.
	 */
	private readonly _onDidFinishInitializing = new vscode.EventEmitter<boolean>();

	/**
	 * An event that is fired when the workspace contents have changed.
	 */
	private readonly _onDidChangeWorkspaceContents = new vscode.EventEmitter<vscode.FileChangeEvent>();

	/**
	 * An event that is fired when the workspace contents have changed.
	 */
	readonly onDidChangeWorkspaceFolder = this._onDidChangeWorkspaceContents.event;

	constructor(documentFactory: DocumentFactory) {
		this._includePatterns = Object.keys(documentFactory.supportedExtensions).map(ext => `**/*${ext}`);

		this.watcher.onDidCreate((uri: vscode.Uri) => {
			if (!documentFactory.isSupportedFile(uri)) {
				return;
			}

			this._files.push(uri);

			this._onDidChangeWorkspaceContents.fire({
				type: vscode.FileChangeType.Created,
				uri: Utils.dirname(uri)
			});

		});

		this.watcher.onDidDelete((uri: vscode.Uri) => {
			if (!documentFactory.isSupportedFile(uri)) {
				return;
			}

			this._files = this._files.filter(f => f.path !== uri.path);

			this._onDidChangeWorkspaceContents.fire({
				type: vscode.FileChangeType.Deleted,
				uri: Utils.dirname(uri)
			});
		});
	}

	/**
	 * Loads the root items of the workspace.
	 */
	async initialize(): Promise<void> {
		vscode.commands.executeCommand('setContext', 'mentor.workspace.isInitializing', true);
		vscode.commands.executeCommand('setContext', 'mentor.workspace.isEmpty', true);

		// Clear the root items.
		this._files = [];

		if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
			const workspaceUri = vscode.workspace.workspaceFolders[0].uri;

			this._excludePatterns = await mentor.getExcludePatterns(workspaceUri);

			// Get the excluded folders pattern relative to the workspace folder.
			const excludedFolders = new vscode.RelativePattern(workspaceUri, '{' + this._excludePatterns.join(",") + '}');

			// Get the included files relative to the requested folder.
			const includedFiles = new vscode.RelativePattern(workspaceUri, '{' + this._includePatterns.join(",") + '}');

			// This will only return files. We need to extract the subfolders separately.
			this._files = await vscode.workspace.findFiles(includedFiles, excludedFolders);
		}

		vscode.commands.executeCommand('setContext', 'mentor.workspace.isEmpty', this._files.length === 0);
		vscode.commands.executeCommand('setContext', 'mentor.workspace.isInitializing', false);

		this._initialized = true;
		this._onDidFinishInitializing.fire(true);
	}

	/**
	 * Wait for the workspace root folders to be initialized.
	 * @returns A promise that resolves when the workspace has been initialized.
	 */
	async waitForInitialized(): Promise<void> {
		if (this._initialized) {
			return;
		}

		return new Promise((resolve) => {
			const listener = this._onDidFinishInitializing.event(() => {
				listener.dispose();
				resolve();
			});
		});
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

		for (let file of this._files) {
			// Skip files that are not in the requested folder.
			if (!file.toString().startsWith(folder)) {
				continue;
			}

			// Get the portion of the URI relative to the folder.
			const relativePath = file.toString().substring(folder.length + 1);

			// If this includes a directory separator, we extract the folder name and add it ot the list of folders.
			if (relativePath.includes('/')) {
				const subFolderName = relativePath.substring(0, relativePath.indexOf('/'));
				const subFolderUri = vscode.Uri.joinPath(folderUri, subFolderName);

				if (!seenFolders.has(subFolderName)) {
					folders.push(subFolderUri);

					seenFolders.add(subFolderName);
				}
			} else if (!seenFiles.has(relativePath)) {
				// Otherwise we add it to the list of files.
				files.push(file);

				seenFiles.add(relativePath);
			}
		}

		return [
			...folders.sort((a, b) => a.path.localeCompare(b.path)),
			...files.sort((a, b) => a.path.localeCompare(b.path))
		];
	}
}