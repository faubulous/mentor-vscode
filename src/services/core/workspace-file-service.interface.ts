import * as vscode from 'vscode';

/**
 * Event arguments for workspace file changes.
 */
export interface WorkspaceFileChangeEvent {
	/**
	 * The type of file change.
	 */
	type: vscode.FileChangeType;

	/**
	 * The URI of the affected file or folder.
	 */
	uri: vscode.Uri;
}

/**
 * Event arguments for changes to the list of discovered workspace files.
 */
export interface WorkspaceFileListChangeEvent {
	/**
	 * The files that were added to the list.
	 */
	added: ReadonlyArray<vscode.Uri>;

	/**
	 * The files that were removed from the list.
	 */
	removed: ReadonlyArray<vscode.Uri>;

	/**
	 * Tracked files whose content was changed on disk outside of an editor.
	 */
	changed: ReadonlyArray<vscode.Uri>;
}

/**
 * Interface for the WorkspaceFileService which provides file discovery,
 * watching, and navigation functionality for the workspace.
 */
export interface IWorkspaceFileService {
	/**
	 * Get all discovered files in the workspace matching the supported extensions.
	 */
	readonly files: ReadonlyArray<vscode.Uri>;

	/**
	 * Indicates if the workspace files have been discovered.
	 */
	readonly initialized: boolean;

	/**
	 * An event that is fired when file discovery has completed.
	 */
	readonly onDidFinishDiscovery: vscode.Event<void>;

	/**
	 * An event that is fired when workspace file contents change (create/delete).
	 */
	readonly onDidChangeFiles: vscode.Event<WorkspaceFileChangeEvent>;

	/**
	 * An event that is fired when files are added to, removed from or changed in
	 * the discovered file list after the initial discovery. Used to keep the
	 * workspace index in sync with the file system.
	 */
	readonly onDidChangeFileList: vscode.Event<WorkspaceFileListChangeEvent>;

	/**
	 * Discovers all supported files in the workspace.
	 * @returns A promise that resolves when discovery is complete.
	 */
	discoverFiles(): Promise<void>;

	/**
	 * Wait for file discovery to complete.
	 * @returns A promise that resolves when discovery has finished.
	 */
	waitForDiscovery(): Promise<void>;

	/**
	 * Generator that yields files matching the given language ID's extensions.
	 * @param languageId The VS Code language identifier (e.g., 'turtle', 'sparql')
	 * @returns Generator yielding matching files one by one.
	 */
	getFilesByLanguageId(languageId: string): AsyncGenerator<vscode.Uri, void, unknown>;

	/**
	 * Retrieves the contents of a folder in the workspace.
	 * @param folderUri The URI of the folder to search in.
	 * @returns A list of matching files and folders sorted by type and name.
	 */
	getFolderContents(folderUri: vscode.Uri): Promise<vscode.Uri[]>;

	/**
	 * Disposes of resources held by this service.
	 */
	dispose(): void;
}
