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
	private static readonly _maxConcurrentFileIndexing = 4;

	/**
	 * Indicates if all workspace files have been indexed.
	 */
	private _indexingFinished = false;

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
			vscode.commands.executeCommand('setContext', 'mentor.workspace.isIndexing', true);

			this._statusBarItem.hide();
			this._statusLog.info(`Started workspace indexing${reindex ? ' (reindex)' : ''}...`);

			this._reportProgress(progress, 0);

			// The default value is set to Number.MAX_SAFE_INTEGER to disable the 
			// file size limit and make issues with the configuration more visible.
			const maxSize = getConfig().get<number>('index.maxFileSize', Number.MAX_SAFE_INTEGER);

			this._statusLog.info(`Using max file size of ${maxSize} bytes`);

			// Load include patterns from the configuration to determine which files 
			// to index regardless of teir size.
			const includeMatchers = this._loadIncludePatterns();
			const skippedFiles: string[] = [];

			// Use the files already discovered by WorkspaceFileService
			const fileUris = this.workspaceFileService.files;
			const indexedUris: vscode.Uri[] = [];

			if (fileUris.length > 0) {
				const startTime = performance.now();

				for (let i = 0; i < fileUris.length; i++) {
					const fileUri = fileUris[i];

					if (this.contextService.contexts[fileUri.toString()] && !reindex) {
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

					if (size > maxSize && !includeMatchers.some(match => match(path))) {
						const message = `Skipped large file ${fileUri.toString()} (${size} bytes)`;
						this._statusLog.warn(message);

						skippedFiles.push(fileUri.toString());
						continue;
					}

					indexedUris.push(fileUri);
				}

				let completed = 0;
				let nextFileIndex = 0;

				const workerCount = Math.min(
					WorkspaceIndexerService._maxConcurrentFileIndexing,
					indexedUris.length
				);

				const workers = Array.from({ length: workerCount }, () => (async () => {
					while (true) {
						const fileIndex = nextFileIndex++;

						if (fileIndex >= indexedUris.length) {
							return;
						}

						const fileUri = indexedUris[fileIndex];

						// Note: We are intentionally not awaiting each individual file indexing.
						if (this.documentFactory.isSupportedNotebookFile(fileUri)) {
							this._indexNotebookDocument(fileUri, reindex);
						} else {
							this._indexTextDocument(fileUri, reindex);
						}

						completed++;

						this._reportProgress(progress, Math.round((completed / fileUris.length) * 100));
					}
				})());

				await Promise.all(workers);

				const totalFiles = fileUris.length;
				const indexedFiles = fileUris.length - skippedFiles.length;
				const endTime = performance.now();
				const duration = Math.round(endTime - startTime);

				this._statusLog.info(`Indexed ${indexedFiles} of ${totalFiles} files in ${duration} ms`);

				let message = [`$(app-mentor) Indexed ${indexedFiles} files`];

				if (skippedFiles.length > 0) {
					message.push(`Skipped ${skippedFiles.length}`);
				}

				this._statusBarItem.text = message.join('; ');
				this._statusBarItem.show();
			}

			this._indexingFinished = true;

			vscode.commands.executeCommand('setContext', 'mentor.workspace.isIndexing', false);

			this._onDidFinishIndexing.fire(true);

			this._reportProgress(progress, 100);

			this._statusLog.info('Finished workspace indexing.');
		});
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
			// ASCII control characters like W3C test files). Skip these gracefully.
			this._statusLog.error(`File ${uri.toString()} cannot be opened as text`);
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
				this._statusLog.error(`Failed to index notebook cell ${cellUri}:`, error);
			}
		}
	}

	/**
	 * Reports progress to the user.
	 * @param progress The progress to report.
	 * @param increment The increment to report.
	 */
	private _reportProgress(progress: vscode.Progress<{ message?: string, increment?: number }>, increment: number): void {
		progress.report({ message: increment + "%" });
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
