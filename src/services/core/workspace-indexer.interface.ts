import * as vscode from 'vscode';

/**
 * Summary statistics of the most recent workspace indexing run.
 */
export interface IndexingStatistics {
	/**
	 * The number of files that were indexed successfully (targeted files minus errors).
	 */
	indexedFiles: number;

	/**
	 * The number of files that failed to index.
	 */
	errorCount: number;

	/**
	 * The number of files that were skipped before indexing (e.g. too large).
	 */
	skippedFiles: number;

	/**
	 * The wall-clock duration of the indexing run, in milliseconds.
	 */
	durationMs: number;
}

/**
 * Interface for the WorkspaceIndexerService which handles indexing
 * of RDF documents in the workspace.
 */
export interface IWorkspaceIndexerService {
	/**
	 * Indicates if all workspace files have been indexed.
	 */
	readonly indexingFinished: boolean;

	/**
	 * Summary statistics of the most recent indexing run, or `undefined` if no
	 * indexing run has completed yet.
	 */
	readonly statistics: IndexingStatistics | undefined;

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

	/**
	 * Open the debug console and show detailed log messages from the indexing process.
	 */
	showIndexStatus(): void;
}
