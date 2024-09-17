import * as vscode from 'vscode';
import * as mentor from './mentor';
import * as path from 'path';
import { DocumentFactory } from './document-factory';

/**
 * Represents a file or folder in the workspace.
 */
export interface WorkspaceItem {
	/**
	 * The name of the item.
	 */
	name: string;

	/**
	 * The URI of the item provided by the Visual Studio Code API.
	 */
	uri: vscode.Uri;

	/**
	 * The type of the item.
	 */
	type: vscode.FileType;
}

/**
 * A repository for retrieving workspace resources such as files and folders.
 */
export class WorkspaceRepository {
	/**
	 * A factory for creating document contexts and checking for supported file formats.
	 */
	private readonly _documentFactory = new DocumentFactory();

	/**
	 * The included file extensions as glob patterns.
	 */
	private _includePatterns = Object.keys(this._documentFactory.supportedExtensions).map(ext => `**/*${ext}`);

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

	constructor() {
		this.watcher.onDidCreate((uri: vscode.Uri) => {
			if (!this._documentFactory.isSupportedFile(uri)) {
				return;
			}

			this._files.push(uri);

			this._onDidChangeWorkspaceContents.fire({
				type: vscode.FileChangeType.Created,
				uri: uri.with({ path: path.dirname(uri.path) })
			});

		});

		this.watcher.onDidDelete((uri: vscode.Uri) => {
			if (!this._documentFactory.isSupportedFile(uri)) {
				return;
			}

			this._files = this._files.filter(f => f.path !== uri.path);

			this._onDidChangeWorkspaceContents.fire({
				type: vscode.FileChangeType.Deleted,
				uri: uri.with({ path: path.dirname(uri.path) })
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

	private _debounce(func: Function, wait: number) {
		let timeout: NodeJS.Timeout;
		return (...args: any[]) => {
			clearTimeout(timeout);
			timeout = setTimeout(() => func.apply(this, args), wait);
		};
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

		for (let file of this._files) {
			// Skip files that are not in the requested folder.
			if (!file.path.startsWith(folderUri.path)) {
				continue;
			}

			const relativePath = path.relative(folderUri.path, file.path);

			if (relativePath.includes(path.sep)) {
				const name = relativePath.substring(0, relativePath.indexOf(path.sep));
				const uri = vscode.Uri.joinPath(folderUri, name);

				if (!seenFolders.has(name)) {
					folders.push(uri);

					seenFolders.add(name);
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