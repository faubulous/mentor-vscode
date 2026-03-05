import * as vscode from 'vscode';

/**
 * Interface for the WorkspaceIndexer.
 */
export interface IWorkspaceIndexer {
	/**
	 * An event that is fired when all workspace files have been indexed.
	 */
	readonly onDidFinishIndexing: vscode.Event<boolean>;

	/**
	 * Builds an index of all RDF resources the current workspace.
	 * @param force Whether to force re-indexing of all files.
	 */
	indexWorkspace(force?: boolean): Promise<void>;

	/**
	 * Reports progress to the user.
	 * @param progress The progress to report.
	 * @param increment The increment to report.
	 */
	reportProgress(progress: vscode.Progress<{ message?: string, increment?: number }>, increment: number): void;

	/**
	 * Wait for all workspace files to be indexed.
	 * @returns A promise that resolves when all workspace files were indexed.
	 */
	waitForIndexed(): Promise<void>;
}
