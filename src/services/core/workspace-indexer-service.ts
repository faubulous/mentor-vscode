import * as vscode from 'vscode';
import picomatch from 'picomatch';
import { IWorkspaceFileService } from './workspace-file-service.interface';
import { IWorkspaceIndexerService, IndexingStatistics } from './workspace-indexer.interface';
import { IDocumentFactory } from '../document/document-factory.interface';
import { IDocumentTokenSource } from '../document/document-token-source.interface';
import { DocumentContextService } from '../document/document-context-service';
import { DocumentDiagnosticsService } from '../document/document-diagnostics-service';
import { getConfig } from '@src/utilities/vscode/config';
import { normalizeGlobPattern } from '@src/utilities/glob';
import { WorkspaceUri } from '@src/providers/workspace-uri';

/**
 * Per-file indexing duration (ms) above which a file is logged as slow. A single
 * RDF file should index in well under a second; anything at or above this points
 * to a stall (e.g. a token-wait timeout) rather than genuine parsing work.
 */
const SLOW_FILE_THRESHOLD_MS = 1000;

/**
 * How many of the slowest files to list in the per-run timing summary.
 */
const SLOWEST_FILES_TO_LOG = 10;

/**
 * How many `fs.stat` calls the pre-scan issues concurrently. The stats are
 * independent; bounding the fan-out keeps remote file systems responsive.
 */
const SCAN_CONCURRENCY = 16;

/**
 * How many upcoming files the indexing loop reads ahead. Parsing is CPU-bound
 * and serialized; prefetching overlaps the next files' I/O with the current
 * file's parse so the loop never idles on a cold read.
 */
const READ_PREFETCH = 4;

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
	 * Summary statistics of the most recent indexing run.
	 */
	private _statistics?: IndexingStatistics;

	/**
	 * The promise of the indexing pass currently in flight, or `undefined` when idle.
	 * Used to serialize concurrent {@link indexWorkspace} calls.
	 */
	private _activeRun?: Promise<void>;

	/**
	 * Indicates that another indexing pass was requested while one was in flight.
	 */
	private _rerunRequested = false;

	/**
	 * Whether the coalesced trailing pass should force re-indexing.
	 */
	private _rerunReindex = false;

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
	// Priorities -10000/-10001/-10002 keep the indexer, graph and SPARQL items in a
	// single contiguous group (indexer → graph → SPARQL, left-to-right). The low
	// values place the group at the far right of the left-aligned status bar — after
	// built-in items like "Auto Attach" (priority 0) — so they are the last items.
	private readonly _statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, -10001);

	constructor(
		private readonly _documentFactory: IDocumentFactory,
		private readonly _contextService: DocumentContextService,
		private readonly _workspaceFileService: IWorkspaceFileService,
		private readonly _tokenSource: IDocumentTokenSource,
		private readonly _diagnosticsService: DocumentDiagnosticsService
	) {
		vscode.commands.executeCommand('setContext', 'mentor.workspace.isIndexing', false);

		this._statusBarItem.command = {
			command: 'mentor.command.openSettings',
			title: 'Open Indexing Settings',
			arguments: ['workspace.indexing']
		};
		this._statusBarItem.tooltip = 'Click to open the indexing settings.';

		// Show the indexer item immediately so the Mentor icon is always visible in the
		// status bar — including on an empty workspace (0 files), where the indexing code
		// paths that update the text run late or with nothing to report.
		this._statusBarItem.text = '$(list-tree) Indexed 0 files';
		this._statusBarItem.show();

		this._statusLog.clear();
	}

	/**
	 * Requests fresh parser output for a document during re-indexing.
	 * @param uri The document URI.
	 */
	private _refreshDocumentTokens(uri: string): void {
		this._tokenSource.refreshTokens(uri);
	}

	/**
	 * Indicates if all workspace files have been indexed.
	 */
	get indexingFinished(): boolean {
		return this._indexingFinished;
	}

	/**
	 * Summary statistics of the most recent indexing run, or `undefined` if none completed yet.
	 */
	get statistics(): IndexingStatistics | undefined {
		return this._statistics;
	}

	/**
	 * Builds an index of all RDF resources in the current workspace.
	 * Uses files discovered by WorkspaceFileService instead of scanning again.
	 *
	 * Concurrent calls are serialized: while a pass is in flight, additional
	 * requests are coalesced into a single trailing pass instead of running
	 * overlapping indexing runs (which would corrupt progress reporting and the
	 * shared store). If any pending request asks for a reindex, the trailing
	 * pass forces a reindex.
	 * @param reindex Whether to force re-indexing of already indexed files.
	 */
	async indexWorkspace(reindex: boolean = false): Promise<void> {
		this._rerunRequested = true;
		this._rerunReindex = this._rerunReindex || reindex;

		if (this._activeRun) {
			return this._activeRun;
		}

		this._activeRun = (async () => {
			try {
				while (this._rerunRequested) {
					this._rerunRequested = false;

					const passReindex = this._rerunReindex;
					this._rerunReindex = false;

					await this._runIndexingPass(passReindex);
				}
			} catch (e) {
				this._statusLog.error(`Error: ${e}`);
			} finally {
				this._activeRun = undefined;
			}
		})();

		return this._activeRun;
	}

	/**
	 * Executes a single indexing pass over the discovered workspace files.
	 * @param reindex Whether to force re-indexing of already indexed files.
	 */
	private async _runIndexingPass(reindex: boolean): Promise<void> {
		const run = this._startIndexingRun(reindex);
		const startTime = performance.now();

		if (run.fileUris.length === 0) {
			// No files to index — still finalize so the status bar shows the
			// summary instead of remaining stuck on the indexing spinner.
			this._finalizeIndexingRun(0, [], { completed: 0, errorCount: 0 }, startTime);
		} else {
			const scanResult = await this._scanIndexFiles(run);

			this._reportProgress(0, scanResult.targetFileUris.length);

			const summary = await this._runIndexingTasks(scanResult.targetFileUris, run);

			this._finalizeIndexingRun(run.fileUris.length, scanResult.skippedFiles, summary, startTime);
		}
	}

	/**
	 * Initializes a workspace indexing run and returns the immutable inputs shared
	 * across the remaining indexing phases.
	 * @param reindex Whether to force re-indexing of already indexed files.
	 * @returns The shared indexing run state.
	 */
	private _startIndexingRun(reindex: boolean): IndexingRun {
		this._indexingFinished = false;

		vscode.commands.executeCommand('setContext', 'mentor.workspace.isIndexing', true);

		// Show indexing progress on the indexer's own status bar item so the live
		// status and the final summary share the same location.
		this._statusBarItem.text = '$(sync~spin) Indexing workspace...';
		this._statusBarItem.show();
		this._statusLog.info(`-- Started workspace indexing${reindex ? ' (reindex)' : ''}...`);

		// The default value is set to Number.MAX_SAFE_INTEGER to disable the
		// file size limit and make issues with the configuration more visible.
		const maxSize = getConfig().get<number>('index.maxFileSize', Number.MAX_SAFE_INTEGER);

		this._statusLog.info(`Using max file size of ${maxSize} bytes`);

		return {
			// Snapshot the discovered files so file-watcher mutations during the
			// run cannot change the pass total mid-flight.
			fileUris: [...this._workspaceFileService.files],
			includeMatchers: this._loadIncludePatterns(),
			maxSize,
			diagnoseFiles: getConfig().get<boolean>('index.diagnoseFiles', true),
			reindex,
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
		const candidates: { fileUri: vscode.Uri; path: string }[] = [];

		for (const fileUri of run.fileUris) {
			if (this._contextService.contexts[fileUri.toString()] && !run.reindex) {
				continue;
			}

			const workspaceUri = WorkspaceUri.toWorkspaceUri(fileUri);

			if (!workspaceUri) {
				const message = `Could not parse workspace URI from ${fileUri.toString()}`;
				this._statusLog.error(message);

				skippedFiles.push(fileUri.toString());
				continue;
			}

			candidates.push({ fileUri, path: this._normalizeFilePath(workspaceUri.path) });
		}

		// Stat the candidates with bounded concurrency: the stats are independent
		// I/O round-trips, and issuing them one-by-one serializes disk/remote-fs
		// latency across the whole corpus.
		for (let i = 0; i < candidates.length; i += SCAN_CONCURRENCY) {
			const chunk = candidates.slice(i, i + SCAN_CONCURRENCY);
			const sizes = await Promise.all(chunk.map(({ fileUri }) => vscode.workspace.fs.stat(fileUri).then(stat => stat.size)));

			for (let j = 0; j < chunk.length; j++) {
				const { fileUri, path } = chunk[j];
				const size = sizes[j];

				if (size > run.maxSize && !run.includeMatchers.some(match => match(path))) {
					const message = `Skipped large file ${fileUri.toString()} (${size} bytes)`;
					this._statusLog.warn(message);

					skippedFiles.push(fileUri.toString());
					continue;
				}

				indexedUris.push(fileUri);
			}
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

		const timings: FileIndexTiming[] = [];

		// Content read-ahead: parsing is CPU-bound and serialized, so the next few
		// files' reads are started while the current file parses. Rejections are
		// silenced here (they would otherwise be unhandled while queued) and
		// surface when the consumer awaits the entry.
		const prefetchedReads = new Map<string, Promise<Uint8Array>>();

		const prefetch = (index: number) => {
			for (let i = index; i < Math.min(index + READ_PREFETCH, indexedUris.length); i++) {
				const uri = indexedUris[i];
				const key = uri.toString();

				if (!prefetchedReads.has(key) && !this._documentFactory.isSupportedNotebookFile(uri)) {
					const read = Promise.resolve(vscode.workspace.fs.readFile(uri));

					read.catch(() => undefined);
					prefetchedReads.set(key, read);
				}
			}
		};

		for (let index = 0; index < indexedUris.length; index++) {
			const fileUri = indexedUris[index];

			prefetch(index);

			const fileStart = performance.now();
			let phases: FileIndexPhases | undefined;

			try {
				phases = await this._indexWorkspaceFile(fileUri, run, prefetchedReads);
			} catch {
				errorCount++;
			} finally {
				prefetchedReads.delete(fileUri.toString());
			}

			const totalMs = Math.round(performance.now() - fileStart);

			// Log every file's duration so the log carries the raw numbers. The
			// open/load split shows whether time went to opening the document (I/O)
			// or to parsing, loading triples and inference (CPU).
			if (phases) {
				this._statusLog.info(
					`Indexed ${fileUri.toString()} in ${totalMs} ms (read ${phases.readMs} ms, load ${phases.loadMs} ms)`
				);

				timings.push({ uri: fileUri.toString(), totalMs, readMs: phases.readMs, loadMs: phases.loadMs });
			}

			// Flag files that took unusually long so latent per-file stalls (e.g. a
			// token-wait timeout) stand out in the log.
			if (totalMs >= SLOW_FILE_THRESHOLD_MS) {
				this._statusLog.warn(`Slow file: ${fileUri.toString()} took ${totalMs} ms`);
			}

			completed++;

			this._reportIndexingProgress(completed, indexedUris.length);
		}

		this._logIndexingTimings(timings);

		return { completed, errorCount };
	}

	/**
	 * Logs aggregate per-file timing for a run: total, average and the slowest
	 * files. This turns the raw per-file lines into a quick summary for spotting
	 * which files dominate the indexing time.
	 * @param timings The per-file timings collected during the run.
	 */
	private _logIndexingTimings(timings: FileIndexTiming[]): void {
		if (timings.length === 0) {
			return;
		}

		const totalMs = timings.reduce((sum, t) => sum + t.totalMs, 0);
		const avgMs = Math.round(totalMs / timings.length);

		this._statusLog.info(`Per-file indexing: ${timings.length} files, ${totalMs} ms total, ${avgMs} ms avg`);

		const slowest = [...timings].sort((a, b) => b.totalMs - a.totalMs).slice(0, SLOWEST_FILES_TO_LOG);

		this._statusLog.info(`Slowest ${slowest.length} files:`);

		for (const t of slowest) {
			this._statusLog.info(`  ${t.totalMs} ms (read ${t.readMs} ms, load ${t.loadMs} ms)  ${t.uri}`);
		}
	}

	/**
	 * Routes a workspace file to the appropriate indexing strategy.
	 * @param fileUri The URI of the workspace file to index.
	 * @param run The shared indexing run state.
	 * @param prefetchedReads Read-ahead file contents keyed by URI, when available.
	 * @returns The open/load phase timings for the file.
	 */
	private _indexWorkspaceFile(fileUri: vscode.Uri, run: IndexingRun, prefetchedReads?: Map<string, Promise<Uint8Array>>): Promise<FileIndexPhases> {
		return this._documentFactory.isSupportedNotebookFile(fileUri)
			? this._indexNotebookDocument(fileUri, run.reindex)
			: this._indexTextDocument(fileUri, run, prefetchedReads);
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

		this._statistics = {
			indexedFiles: successfulFiles,
			errorCount: summary.errorCount,
			skippedFiles: skippedFiles.length,
			durationMs: duration,
		};

		this._statusLog.info(`Indexed ${successfulFiles} of ${totalFiles} files in ${duration} ms`);

		const parts = [`$(list-tree) Indexed ${successfulFiles} files`];

		if (summary.errorCount > 0) {
			parts.push(`${summary.errorCount} error${summary.errorCount > 1 ? 's' : ''}`);
		}

		if (skippedFiles.length > 0) {
			parts.push(`${skippedFiles.length} skipped`);
		}

		// The tooltip mirrors the format of the SHACL validation status bar item.
		const tooltip = `Workspace indexing: ${totalFiles} files discovered, `
			+ `${successfulFiles} indexed, ${summary.errorCount} errors, ${skippedFiles.length} skipped.`
			+ '\nClick to open the indexing settings.';

		this._statusBarItem.text = parts.join('; ');
		this._statusBarItem.tooltip = tooltip;
		this._statusBarItem.show();

		this._finishIndexing();
	}

	/**
	 * Reports per-file indexing progress using completed and total file counts.
	 * @param completed The number of completed indexing tasks.
	 * @param total The total number of scheduled indexing tasks.
	 */
	private _reportIndexingProgress(completed: number, total: number): void {
		if (total === 0) {
			return;
		}

		this._reportProgress(completed, total);
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
			const pattern = normalizeGlobPattern(rawPattern);

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
	 *
	 * Reads the file bytes and builds the context from content instead of opening
	 * a VS Code text document per file: profiling showed `openTextDocument`
	 * (document-model creation + `onDidOpenTextDocument` notifications) dominated
	 * indexing time, while the actual RDF parsing is cheap. An already-open
	 * document is reused so live, possibly unsaved, content wins.
	 * @param uri The URI of the document to index.
	 * @param run The shared indexing run state.
	 * @param prefetchedReads Read-ahead file contents keyed by URI, when available.
	 * @returns The read/load phase timings for the document.
	 */
	private async _indexTextDocument(uri: vscode.Uri, run: IndexingRun, prefetchedReads?: Map<string, Promise<Uint8Array>>): Promise<FileIndexPhases> {
		// The `open` phase now measures reading the content (from an open document
		// or from disk) rather than opening a text document.
		const openStart = performance.now();

		// Prefer an already-open document so unsaved edits win. This set is tiny
		// during indexing, so the lookup is cheap.
		const openDocument = vscode.workspace.textDocuments.find(d => d.uri.toString() === uri.toString());

		let content: string;

		if (openDocument) {
			content = openDocument.getText();
		} else {
			try {
				// A prefetched read may already be resolved (started while the previous
				// file was parsing), in which case this await is effectively free.
				const bytes = await (prefetchedReads?.get(uri.toString()) ?? vscode.workspace.fs.readFile(uri));

				content = new TextDecoder().decode(bytes);
			} catch (error) {
				// Log and rethrow so the background settlement can count failures accurately.
				this._statusLog.error(`File ${uri.toString()} cannot be read`);
				throw error;
			}
		}

		const readMs = Math.round(performance.now() - openStart);

		// Re-check after the async read: handleActiveEditorChanged may have registered
		// this context while we were awaiting (TOCTOU guard).
		if (this._contextService.contexts[uri.toString()] && !run.reindex) {
			return { readMs, loadMs: 0 };
		}

		// Load the document so that its graph is created and can be used for showing definitions, descriptions etc..
		const loadStart = performance.now();
		const loadPromise = this._contextService.loadDocumentContent(uri, content, run.reindex);

		if (run.reindex) {
			await Promise.all([
				loadPromise,
				// Refresh editor tokens for an open document; a no-op for files not
				// open in an editor.
				this._refreshDocumentTokens(uri.toString())
			]);
		} else {
			await loadPromise;
		}

		const loadMs = Math.round(performance.now() - loadStart);

		// Compute syntax and lint diagnostics in-process from the content we already
		// read (no openTextDocument), so `index.diagnoseFiles` gives the workspace-wide
		// problems overview without the per-file document-open cost. The flag is
		// snapshotted once per run instead of re-read per file.
		if (run.diagnoseFiles) {
			this._diagnosticsService.diagnoseContent(uri, content);
		}

		return { readMs, loadMs };
	}

	/**
	 * Index RDF cells within a notebook document.
	 * @param notebookUri The URI of the notebook file.
	 * @param reindex Whether to force re-indexing of already indexed cells.
	 * @returns The open/load phase timings for the notebook.
	 */
	private async _indexNotebookDocument(notebookUri: vscode.Uri, reindex: boolean): Promise<FileIndexPhases> {
		const openStart = performance.now();
		const notebook = await vscode.workspace.openNotebookDocument(notebookUri);
		const readMs = Math.round(performance.now() - openStart);

		const loadStart = performance.now();

		for (const cell of notebook.getCells()) {
			const lang = cell.document.languageId;

			if (!this._documentFactory.supportedLanguages.has(lang)) {
				continue;
			}

			const cellUri = cell.document.uri.toString();

			if (this._contextService.contexts[cellUri] && !reindex) {
				continue;
			}

			try {
				// Load the cell document to create its context, passing the slug so that
				// graphIri is slug-based from the very first loadTriples call.
				const slug = cell.metadata?.slug as string | undefined;
				const loadPromise = this._contextService.loadDocument(cell.document, reindex, slug);

				if (reindex) {
					await Promise.all([
						loadPromise,
						this._refreshDocumentTokens(cellUri)
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

		return { readMs, loadMs: Math.round(performance.now() - loadStart) };
	}

	/**
	 * Marks indexing as finished, fires the completion event, and resets the VS Code context flag.
	 */
	private _finishIndexing(): void {
		this._indexingFinished = true;

		vscode.commands.executeCommand('setContext', 'mentor.workspace.isIndexing', false);

		this._onDidFinishIndexing.fire(true);

		this._statusLog.info('-- Finished workspace indexing.');
	}

	/**
	 * Reports indexing progress on the status bar item.
	 * @param completed The number of files indexed so far.
	 * @param total The total number of files to index.
	 */
	private _reportProgress(completed: number, total: number): void {
		this._statusBarItem.text = `$(sync~spin) Indexing: ${completed} of ${total} files...`;
		this._statusBarItem.show();
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
	 * Whether syntax/lint diagnostics are computed per indexed file. Snapshotted
	 * once per run so the hot loop does not re-read the configuration per file.
	 */
	diagnoseFiles: boolean;

	/**
	 * Indicates whether already indexed files should be indexed again.
	 */
	reindex: boolean;
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
 * The read/load phase durations (ms) measured while indexing a single file.
 */
type FileIndexPhases = {
	/**
	 * Time spent acquiring the content — reading the file bytes, or reading an
	 * already-open document's text (I/O) — in milliseconds.
	 */
	readMs: number;

	/**
	 * Time spent loading the document — parsing, loading triples and inference
	 * (CPU) — in milliseconds.
	 */
	loadMs: number;
};

/**
 * A single file's indexing timing, including its URI, for run summaries.
 */
type FileIndexTiming = FileIndexPhases & {
	/**
	 * The indexed file URI.
	 */
	uri: string;

	/**
	 * The total wall-clock time to index the file (ms), including overhead
	 * around the open/load phases.
	 */
	totalMs: number;
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