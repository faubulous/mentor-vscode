import * as vscode from 'vscode';
import * as mentor from './mentor';
import * as minimatch from 'minimatch';
import * as path from 'path';

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
	 * The regular expression for supported file extensions.
	 */
	private readonly _include = /\.ttl$|\.nt$|\.owl$|\.trig$|\.nq$|\.n3|\.sparql$/;

	/**
	 * The regular expression for excluding files and folders from the workspace.
	 */
	private readonly _excluded: RegExp[] = [];

	/**
	 * The root items of the workspace.
	 */
	readonly rootItems: WorkspaceItem[] = [];

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
	private readonly _onInitialized = new vscode.EventEmitter<boolean>();

	/**
	 * An event that is fired when the workspace contents have changed.
	 */
	private readonly _onDidChangeWorkspaceContents = new vscode.EventEmitter<vscode.Uri | undefined>();

	/**
	 * An event that is fired when the workspace contents have changed.
	 */
	readonly onDidChangeWorkspaceFolder = this._onDidChangeWorkspaceContents.event;

	constructor() {
		this.watcher.onDidCreate((e) => this._onDidChangeWorkspaceContents.fire(_getDirectoryUri(e)));
		this.watcher.onDidDelete((e) => this._onDidChangeWorkspaceContents.fire(_getDirectoryUri(e)));
	}

	/**
	 * Loads the root items of the workspace.
	 */
	async initialize(): Promise<WorkspaceItem[]> {
		vscode.commands.executeCommand('setContext', 'mentor.workspace.isInitializing', true);
		vscode.commands.executeCommand('setContext', 'mentor.workspace.isEmpty', true);

		// Clear the root items.
		this.rootItems.length = 0;

		if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
			const workspaceUri = vscode.workspace.workspaceFolders[0].uri;

			await this._initializeExcludePatterns(workspaceUri);

			for (const item of await this.getFolderContents(workspaceUri)) {
				this.rootItems.push(item);
			}

			this._onDidChangeWorkspaceContents.fire(undefined);
		}

		vscode.commands.executeCommand('setContext', 'mentor.workspace.isEmpty', this.rootItems.length === 0);
		vscode.commands.executeCommand('setContext', 'mentor.workspace.isInitializing', false);

		this._initialized = true;
		this._onInitialized.fire(true);

		return this.rootItems;
	}

	private async _initializeExcludePatterns(workspaceUri: vscode.Uri): Promise<void> {
		// Collect the regex patterns for excluding files and folders in a set to remove duplicates.
		let result = new Set<string>();

		// Add the patterns from the configuration.
		let ignoreFolders = await mentor.getExcludePatterns(workspaceUri);

		// Now initialize the dedupliacted patterns as regular expressions.
		for (const regex of this._getGlobPatternsAsRegExp(Array.from(result))) {
			this._excluded.push(new RegExp(regex));
		}
	}

	/**
	 * Convert glob patterns to regular expressions.
	 * @param patterns An array of glob patterns.
	 * @returns An array of regular expressions for the glob patterns.
	 */
	private _getGlobPatternsAsRegExp(patterns: string[]): string[] {
		let result = [];

		for (const pattern of patterns) {
			let regex = minimatch.makeRe(pattern);

			if (regex) {
				result.push(regex.source);
			}
		}

		return result;
	}

	/**
	 * Indicates if a workspace item shoould be included in the workspace tree.
	 * @param item A workspace item.
	 * @returns `true` if the item should be included in the workspace tree, `false` otherwise.
	 */
	private _isIncludedItem(item: WorkspaceItem): boolean {
		return !_isDirectory(item) && this._include.test(item.name);
	}

	/**
	 * Indicates if a workspace item should be excluded from the workspace tree.
	 * @param item A workspace item.
	 * @returns `true` if the item should be excluded from the workspace tree, `false` otherwise.
	 */
	private _isExcludedItem(item: WorkspaceItem): boolean {
		for (const pattern of this._excluded) {
			if (pattern.test(item.uri.path)) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Wait for the workspace root folders to be initialized.
	 * @returns A promise that resolves when the workspace has been initialized.
	 */
	async waitForInitialization(): Promise<void> {
		if (this._initialized) {
			return;
		}

		return new Promise((resolve) => {
			const listener = this._onInitialized.event(() => {
				listener.dispose();
				resolve();
			});
		});
	}

	/**
	 * Retrieves the contents of a folder in the workspace.
	 */
	async getFolderContents(uri: vscode.Uri): Promise<WorkspaceItem[]> {
		return this._findMatchingFilesOrFolders(uri);
	}

	/**
	 * Retrieves the contents of a folder in the workspace.
	 * @param folderUri The URI of the folder to search in.
	 * @param include A regular expression for including files and folders.
	 * @param exclude A regular expression for excluding files and folders.
	 * @returns A list of matching files and folders sorted by type and name.
	 */
	private async _findMatchingFilesOrFolders(folderUri: vscode.Uri): Promise<WorkspaceItem[]> {
		const result: WorkspaceItem[] = [];
		const entries = await vscode.workspace.fs.readDirectory(folderUri);

		// We look at files first because this can significantly reduce the number of file system operations needed.
		for (const item of entries.map(e => _mapEntryToWorkspaceItem(folderUri, e)).sort(_sortFilesFirst)) {
			if (this._isExcludedItem(item)) {
				continue;
			} else if (this._isIncludedItem(item) || await this._hasMatchingFiles(item)) {
				result.push(item);
			}
		}

		return result.sort(_sortDirectoriesFirst);
	}

	/**
	 * Indicates if a folder contains matching files.
	 * @param folder The folder to search in.
	 * @returns `true` if the folder contains matching files, `false` otherwise.
	 */
	private async _hasMatchingFiles(folder: WorkspaceItem): Promise<boolean> {
		if (!_isDirectory(folder)) {
			return false;
		}

		const entries = await vscode.workspace.fs.readDirectory(folder.uri);

		for (const item of entries.map(e => _mapEntryToWorkspaceItem(folder.uri, e)).sort(_sortFilesFirst)) {
			if (this._isExcludedItem(item)) {
				continue;
			} else if (this._isIncludedItem(item) || await this._hasMatchingFiles(item)) {
				return true;
			}
		}

		return false;
	}
}

/**
 * Indicates if a workspace item is a directory.
 * @param item A workspace item.
 * @returns ´true´ if the item is a directory, ´false´ otherwise.
 */
function _isDirectory(item: WorkspaceItem): boolean {
	return item.type === vscode.FileType.Directory;
}

function _getDirectoryUri(uri: vscode.Uri): vscode.Uri {
	return uri.with({ path: path.dirname(uri.path) });
}

function _mapEntryToWorkspaceItem(folderUri: vscode.Uri, entry: [string, vscode.FileType]): WorkspaceItem {
	return {
		name: entry[0],
		uri: vscode.Uri.joinPath(folderUri, entry[0]),
		type: entry[1]
	};
}

function _sortDirectoriesFirst(a: WorkspaceItem, b: WorkspaceItem): number {
	if (_isDirectory(a) && !_isDirectory(b)) {
		return -1;
	}

	if (!_isDirectory(a) && _isDirectory(b)) {
		return 1;
	}

	return a.uri.path.localeCompare(b.uri.path);
}

function _sortFilesFirst(a: WorkspaceItem, b: WorkspaceItem): number {
	if (!_isDirectory(a) && _isDirectory(b)) {
		return -1;
	}

	if (_isDirectory(a) && !_isDirectory(b)) {
		return 1;
	}

	return a.uri.path.localeCompare(b.uri.path);
}