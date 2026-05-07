import * as vscode from 'vscode';
import picomatch from 'picomatch';
import { IWorkspaceFileService } from './workspace-file-service.interface';
import { IWorkspaceIndexerService } from './workspace-indexer.interface';
import { IDocumentFactory } from '../document/document-factory.interface';
import { DocumentContextService } from '../document/document-context-service';
import { getConfig } from '@src/utilities/vscode/config';
import { WorkspaceUri } from '@src/providers/workspace-uri';
import { ILanguageClientRegistry } from '@src/languages/language-client-registry';

/**
 * Service for indexing RDF documents in the current workspace.
 * Uses WorkspaceFileService for file discovery to avoid duplicate workspace scans.
 */
export class WorkspaceIndexerService implements IWorkspaceIndexerService {
	/**
	 * Indicates if all workspace files have been indexed.
	 */
	private _indexingFinished = false;

	/**
	 * A promise that resolves when all background indexing tasks have 
	 * settled (either fulfilled or rejected).
	 */
	private readonly _onDidFinishIndexing = new vscode.EventEmitter<boolean>();

	/**
	 * An event that is fired when all workspace files have been indexed.
	 */
	readonly onDidFinishIndexing = this._onDidFinishIndexing.event;

	/**
	 * A log output channel for indexing-related messages.
	 */
	private readonly _statusLog: vscode.LogOutputChannel = vscode.window.createOutputChannel('Mentor Indexer', { log: true });

	/**
	 * A status bar item to show indexing related status messages.
	 */
	private readonly _statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, -10000);

	constructor(
		private readonly documentFactory: IDocumentFactory,
		private readonly contextService: DocumentContextService,
		private readonly workspaceFileService: IWorkspaceFileService,
		private readonly languageClientRegistry: ILanguageClientRegistry
	) {
		vscode.commands.executeCommand('setContext', 'mentor.workspace.isIndexing', false);

		this._statusBarItem.command = 'mentor.command.showIndexStatus';
		this._statusBarItem.tooltip = 'Show Indexer Status Log';
		this._statusLog.clear();
	}

	/**
	 * Indicates if all workspace files have been indexed.
	 */
	get indexingFinished(): boolean {
		return this._indexingFinished;
	}

	/**
	 * Builds an index of all RDF resources in the current workspace.
	 * Uses files discovered by WorkspaceFileService instead of scanning again.
	 */
	async indexWorkspace(reindex: boolean = false): Promise<void> {
		return vscode.window.withProgress({
			location: vscode.ProgressLocation.Window,
			title: "Indexing workspace",
			cancellable: false
		}, async (progress) => {
			const run = this._startIndexingRun(reindex, progress);

			if (run.fileUris.length === 0) {
				this._finishIndexing();
				this._reportProgress(progress, 0, 0);
			} else {

				const startTime = performance.now();
				const scanResult = await this._scanIndexFiles(run);

				this._reportProgress(progress, 0, scanResult.targetFileUris.length);
				
				const summary = await this._runIndexingTasks(scanResult.targetFileUris, run);

				this._finalizeIndexingRun(run.fileUris.length, scanResult.skippedFiles, summary, startTime);
				this._reportProgress(progress, summary.completed, scanResult.targetFileUris.length);
			}
		});
	}

	/**
	 * Initializes a workspace indexing run and returns the immutable inputs shared
	 * across the remaining indexing phases.
	 * @param reindex Whether to force re-indexing of already indexed files.
	 * @param progress The progress reporter for the current run.
	 * @returns The shared indexing run state.
	 */
	private _startIndexingRun(
		reindex: boolean,
		progress: vscode.Progress<{ message?: string, increment?: number }>
	): IndexingRun {
		this._indexingFinished = false;

		vscode.commands.executeCommand('setContext', 'mentor.workspace.isIndexing', true);

		this._statusBarItem.hide();
		this._statusLog.info(`Started workspace indexing${reindex ? ' (reindex)' : ''}...`);

		// The default value is set to Number.MAX_SAFE_INTEGER to disable the
		// file size limit and make issues with the configuration more visible.
		const maxSize = getConfig().get<number>('index.maxFileSize', Number.MAX_SAFE_INTEGER);

		this._statusLog.info(`Using max file size of ${maxSize} bytes`);

		return {
			fileUris: this.workspaceFileService.files,
			includeMatchers: this._loadIncludePatterns(),
			maxSize,
			reindex,
			progress,
		};
	}

	/**
	 * Filters workspace files down to the URIs that should be indexed for this run.
	 * @param run The shared indexing run state.
	 * @returns The URIs to index and the skipped file paths for reporting.
	 */
	private async _scanIndexFiles(run: IndexingRun): Promise<IndexScanResult> {
		const indexedUris: vscode.Uri[] = [];
		const skippedFiles: string[] = [];

		for (const fileUri of run.fileUris) {
			if (this.contextService.contexts[fileUri.toString()] && !run.reindex) {
				continue;
			}

			const workspaceUri = WorkspaceUri.toWorkspaceUri(fileUri);

			if (!workspaceUri) {
				const message = `Could not parse workspace URI from ${fileUri.toString()}`;
				this._statusLog.error(message);

				skippedFiles.push(fileUri.toString());
				continue;
			}

			const path = this._normalizeFilePath(workspaceUri.path);
			const stat = await vscode.workspace.fs.stat(fileUri);
			const size = stat.size;

			if (size > run.maxSize && !run.includeMatchers.some(match => match(path))) {
				const message = `Skipped large file ${fileUri.toString()} (${size} bytes)`;
				this._statusLog.warn(message);

				skippedFiles.push(fileUri.toString());
				continue;
			}

			indexedUris.push(fileUri);
		}

		return { targetFileUris: indexedUris, skippedFiles };
	}

	/**
	 * Indexes each file sequentially and returns a completion summary.
	 * @param indexedUris The file URIs that should be indexed.
	 * @param run The shared indexing run state.
	 * @returns Completion and error counts for the run.
	 */
	private async _runIndexingTasks(indexedUris: readonly vscode.Uri[], run: IndexingRun): Promise<IndexingTaskSummary> {
		let completed = 0;
		let errorCount = 0;

		for (const fileUri of indexedUris) {
			try {
				await this._indexWorkspaceFile(fileUri, run.reindex);
			} catch {
				errorCount++;
			}

			completed++;

			this._reportIndexingProgress(run.progress, completed, indexedUris.length);
		}

		return { completed, errorCount };
	}

	/**
	 * Routes a workspace file to the appropriate indexing strategy.
	 * @param fileUri The URI of the workspace file to index.
	 * @param reindex Whether to force re-indexing of already indexed data.
	 * @returns A promise that settles when indexing of the file completes.
	 */
	private _indexWorkspaceFile(fileUri: vscode.Uri, reindex: boolean): Promise<void> {
		return this.documentFactory.isSupportedNotebookFile(fileUri)
			? this._indexNotebookDocument(fileUri, reindex)
			: this._indexTextDocument(fileUri, reindex);
	}

	/**
	 * Finalizes a completed indexing run by updating status output and lifecycle state.
	 * @param totalFiles The total number of discovered workspace files.
	 * @param skippedFiles The file URIs skipped before indexing.
	 * @param summary The settled task summary.
	 * @param startTime The run start time in milliseconds.
	 */
	private _finalizeIndexingRun(
		totalFiles: number,
		skippedFiles: string[],
		summary: IndexingTaskSummary,
		startTime: number
	): void {
		const indexedFiles = totalFiles - skippedFiles.length;
		const duration = Math.round(performance.now() - startTime);
		const successfulFiles = indexedFiles - summary.errorCount;

		this._statusLog.info(`Indexed ${successfulFiles} of ${totalFiles} files in ${duration} ms`);

		const parts = [`$(app-mentor) Loaded ${successfulFiles} files`];

		if (summary.errorCount > 0) {
			parts.push(`${summary.errorCount} error${summary.errorCount > 1 ? 's' : ''}`);
		}

		if (skippedFiles.length > 0) {
			parts.push(`${skippedFiles.length} skipped`);
		}

		this._statusBarItem.text = parts.join('; ');
		this._statusBarItem.show();

		this._finishIndexing();
	}

	/**
	 * Reports per-file indexing progress using completed and total file counts.
	 * @param progress The progress reporter for the current run.
	 * @param completed The number of completed indexing tasks.
	 * @param total The total number of scheduled indexing tasks.
	 */
	private _reportIndexingProgress(
		progress: vscode.Progress<{ message?: string, increment?: number }>,
		completed: number,
		total: number
	): void {
		if (total === 0) {
			return;
		}

		this._reportProgress(progress, completed, total);
	}

	/**
	 * Gets the list of files to include in the workspace index, based on the 
	 * 'mentor.index.includeFiles' configuration setting.
	 * @returns An array of canonical workspace URIs as strings.
	 */
	private _loadIncludePatterns(): picomatch.Matcher[] {
		const result: picomatch.Matcher[] = [];

		let hasErrors = false;

		for (const rawPattern of getConfig().get<string[]>('index.includeFiles', [])) {
			const pattern = this._normalizeGlobPattern(rawPattern);

			if (!pattern) {
				this._statusLog.error("Empty pattern in 'mentor.index.includeFiles'.");
				hasErrors = true;
				continue;
			}

			try {
				// Treat patterns as repository/workspace-relative globs.
				// Examples: data/**/*.ttl, ontologies/*.trig
				const matcher = picomatch(pattern, {
					dot: true,
					nocase: false,
					bash: false
				});

				result.push(matcher);

				this._statusLog.info(`Loaded include glob: ${pattern}`);
			} catch (error) {
				this._statusLog.error(`Invalid glob pattern in 'mentor.index.includeFiles': ${rawPattern}`, error);
				hasErrors = true;
			}
		}

		if (hasErrors) {
			const message = "One or more invalid glob patterns detected in mentor.index.includeFiles";
			const action = "View Log";

			void vscode.window.showWarningMessage(message, action).then(selected => {
				if (selected === action) {
					void vscode.commands.executeCommand("mentor.command.showIndexStatus");
				}
			});
		}

		return result;
	}

	/**
	 * Normalizes a glob pattern by trimming whitespace, converting backslashes to forward 
	 * slashes, and removing leading './' or '/' characters. This ensures consistent matching 
	 * against normalized file paths.
	 * @param pattern The glob pattern to normalize.
	 * @returns The normalized glob pattern.
	 */
	private _normalizeGlobPattern(pattern: string): string {
		return pattern
			.trim()
			.replace(/\\/g, "/")
			.replace(/^\.\/+/, "")
			.replace(/^\/+/, "");
	}

	/**
	 * Normalizes a file path by trimming whitespace, converting backslashes to forward slashes,
	 * and removing leading slashes. This ensures consistent matching against normalized glob patterns.
	 * @param path The file path to normalize.
	 * @returns The normalized file path.
	 */
	private _normalizeFilePath(path: string): string {
		return path
			.trim()
			.replace(/\\/g, "/")
			.replace(/^\/+/, "");
	}

	/**
	 * Index a regular text document.
	 * @param uri The URI of the document to index.
	 * @param reindex Whether to force re-indexing of the document.
	 */
	private async _indexTextDocument(uri: vscode.Uri, reindex: boolean): Promise<void> {
		try {
			// Open the document to trigger the language server to analyze it.
			const document = await vscode.workspace.openTextDocument(uri);

			// Re-check after the async open: handleActiveEditorChanged may have registered
			// this context while we were awaiting openTextDocument (TOCTOU guard).
			if (this.contextService.contexts[document.uri.toString()] && !reindex) {
				return;
			}

			// Try to load the document so that its graph is created and can be used for showing definitions, descriptions etc..
			const loadPromise = this.contextService.loadDocument(document, reindex);

			if (reindex) {
				await Promise.all([
					loadPromise,
					this.languageClientRegistry.requestContextRefresh(document.languageId, document.uri.toString())
				]);
				return;
			}

			await loadPromise;
		} catch (error) {
			// VS Code may refuse to open files it considers binary (e.g., files containing
			// ASCII control characters like W3C test files). Log and rethrow so the
			// background settlement can count failures accurately.
			this._statusLog.error(`File ${uri.toString()} cannot be opened as text`);
			throw error;
		}
	}

	/**
	 * Index RDF cells within a notebook document.
	 * @param notebookUri The URI of the notebook file.
	 * @param reindex Whether to force re-indexing of already indexed cells.
	 */
	private async _indexNotebookDocument(notebookUri: vscode.Uri, reindex: boolean): Promise<void> {
		const notebook = await vscode.workspace.openNotebookDocument(notebookUri);

		for (const cell of notebook.getCells()) {
			const lang = cell.document.languageId;

			// Index triple-source cells (Turtle, TriG, etc.) for RDF graph data, and
			// also index supported non-triple-source cells (e.g. SPARQL) so that their
			// token-based `references` maps are populated for cross-file rename support.
			if (!this.documentFactory.isTripleSourceLanguage(lang) && !this.documentFactory.supportedLanguages.has(lang)) {
				continue;
			}

			const cellUri = cell.document.uri.toString();

			if (this.contextService.contexts[cellUri] && !reindex) {
				continue;
			}

			try {
				// Load the cell document to create its context, passing the slug so that
				// graphIri is slug-based from the very first loadTriples call.
				const slug = cell.metadata?.slug as string | undefined;
				const loadPromise = this.contextService.loadDocument(cell.document, reindex, slug);

				if (reindex) {
					await Promise.all([
						loadPromise,
						this.languageClientRegistry.requestContextRefresh(lang, cellUri)
					]);
					continue;
				}

				await loadPromise;
			} catch (error) {
				// Log and rethrow so the background settlement can count failures accurately.
				this._statusLog.error(`Failed to index notebook cell ${cellUri}:`, error);
				throw error;
			}
		}
	}

	/**
	 * Marks indexing as finished, fires the completion event, and resets the VS Code context flag.
	 */
	private _finishIndexing(): void {
		this._indexingFinished = true;

		vscode.commands.executeCommand('setContext', 'mentor.workspace.isIndexing', false);

		this._onDidFinishIndexing.fire(true);

		this._statusLog.info('Finished workspace indexing.');
	}

	/**
	 * Reports progress to the user.
	 * @param progress The progress to report.
	 * @param completed The number of files indexed so far.
	 * @param total The total number of files to index.
	 */
	private _reportProgress(
		progress: vscode.Progress<{ message?: string, increment?: number }>,
		completed: number,
		total: number
	): void {
		progress.report({ message: `${completed} of ${total} files...` });
	}

	/**
	 * Wait for all workspace files to be indexed.
	 * @returns A promise that resolves when all workspace files were indexed.
	 */
	async waitForIndexed(): Promise<void> {
		if (this._indexingFinished) {
			return;
		}

		return new Promise((resolve) => {
			const listener = this._onDidFinishIndexing.event(() => {
				listener.dispose();
				resolve();
			});
		});
	}

	/**
	 * Open the debug console and show detailed log messages from the indexing process.
	 */
	showIndexStatus(): void {
		this._statusLog.show();
	}
}

/**
 * Shared immutable inputs for a single workspace indexing run.
 */
type IndexingRun = {
	/**
	 * The workspace files discovered before pre-scan filtering is applied.
	 */
	fileUris: ReadonlyArray<vscode.Uri>;

	/**
	 * The configured include globs that can override file size exclusions.
	 */
	includeMatchers: picomatch.Matcher[];

	/**
	 * The maximum file size allowed for indexing unless explicitly included.
	 */
	maxSize: number;

	/**
	 * Indicates whether already indexed files should be indexed again.
	 */
	reindex: boolean;

	/**
	 * The VS Code progress reporter for the active indexing run.
	 */
	progress: vscode.Progress<{ message?: string, increment?: number }>;
};

/**
 * The result of scanning workspace files before scheduling indexing tasks.
 */
type IndexScanResult = {
	/**
	 * The file URIs that passed pre-scan checks and should be indexed.
	 */
	targetFileUris: vscode.Uri[];

	/**
	 * The file identifiers skipped during the pre-scan phase.
	 */
	skippedFiles: string[];
};

/**
 * Settlement summary for the indexing tasks in a run.
 */
type IndexingTaskSummary = {
	/**
	 * The number of indexing tasks that completed.
	 */
	completed: number;

	/**
	 * The number of indexing tasks that failed.
	 */
	errorCount: number;
};