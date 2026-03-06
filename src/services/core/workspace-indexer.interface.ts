import * as vscode from 'vscode';

/**
 * Interface for the WorkspaceIndexerService which handles indexing
 * of RDF documents in the workspace.
 */
export interface IWorkspaceIndexerService {
	/**
	 * Indicates if all workspace files have been indexed.
	 */
	readonly indexed: boolean;

	/**
	 * An event that is fired when all workspace files have been indexed.
	 */
	readonly onDidFinishIndexing: vscode.Event<boolean>;

	/**
	 * Builds an index of all RDF resources in the current workspace.
	 * @param force Whether to force re-indexing of all files.
	 */
	indexWorkspace(force?: boolean): Promise<void>;

	/**
	 * Wait for all workspace files to be indexed.
	 * @returns A promise that resolves when all workspace files were indexed.
	 */
	waitForIndexed(): Promise<void>;
}
