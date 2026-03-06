import * as vscode from 'vscode';
import { ConfigurationService } from './configuration-service';
import { IWorkspaceFileService } from './workspace-file-service.interface';
import { IWorkspaceIndexerService } from './workspace-indexer.interface';
import { DocumentFactory } from '../../workspace/document-factory';
import { DocumentContextService } from '../document/document-context-service';

/**
 * Service for indexing RDF documents in the current workspace.
 * Uses WorkspaceFileService for file discovery to avoid duplicate workspace scans.
 */
export class WorkspaceIndexerService implements IWorkspaceIndexerService {
	/**
	 * Indicates if all workspace files have been indexed.
	 */
	private _indexed = false;

	private readonly _onDidFinishIndexing = new vscode.EventEmitter<boolean>();

	/**
	 * An event that is fired when all workspace files have been indexed.
	 */
	readonly onDidFinishIndexing = this._onDidFinishIndexing.event;

	constructor(
		private readonly documentFactory: DocumentFactory,
		private readonly configurationService: ConfigurationService,
		private readonly contextService: DocumentContextService,
		private readonly workspaceFileService: IWorkspaceFileService
	) {
		vscode.commands.executeCommand('setContext', 'mentor.workspace.isIndexing', false);
	}

	/**
	 * Indicates if all workspace files have been indexed.
	 */
	get indexed(): boolean {
		return this._indexed;
	}

	/**
	 * Builds an index of all RDF resources in the current workspace.
	 * Uses files discovered by WorkspaceFileService instead of scanning again.
	 */
	async indexWorkspace(force: boolean = false): Promise<void> {
		return vscode.window.withProgress({
			location: vscode.ProgressLocation.Window,
			title: "Indexing workspace",
			cancellable: false
		}, async (progress) => {
			vscode.commands.executeCommand('setContext', 'mentor.workspace.isIndexing', true);

			this._reportProgress(progress, 0);

			// The default value is set to Number.MAX_SAFE_INTEGER to disable the 
			// file size limit and make issues with the configuration more visible.
			const maxSize = this.configurationService.get<number>('index.maxFileSize', Number.MAX_SAFE_INTEGER);

			// Use the files already discovered by WorkspaceFileService
			const uris = this.workspaceFileService.files;

			if (uris.length > 0) {
				const startTime = performance.now();

				for (let i = 0; i < uris.length; i++) {
					const uri = uris[i];
					const u = uri.toString();

					if (this.contextService.contexts[u] && !force) {
						continue;
					}

					const stat = await vscode.workspace.fs.stat(uri);
					const size = stat.size;

					if (size > maxSize && !force) {
						console.debug(`Mentor: Skipping large file ${uri.toString()} (${size} bytes)`);
						continue;
					}

					if (this.documentFactory.isSupportedNotebookFile(uri)) {
						this._indexNotebookDocument(uri, force);
					} else {
						this._indexTextDocument(uri, force);
					}

					this._reportProgress(progress, Math.round(((i + 1) / uris.length) * 100));
				}

				const endTime = performance.now();

				console.debug(`Mentor: Indexing took ${endTime - startTime} ms`);
			}

			this._indexed = true;

			this._reportProgress(progress, 100);

			vscode.commands.executeCommand('setContext', 'mentor.workspace.isIndexing', false);

			this._onDidFinishIndexing.fire(true);
		});
	}

	/**
	 * Index a regular text document.
	 * @param uri The URI of the document to index.
	 * @param force Whether to force re-indexing of the document.
	 */
	private async _indexTextDocument(uri: vscode.Uri, force: boolean): Promise<void> {
		try {
			// Open the document to trigger the language server to analyze it.
			const document = await vscode.workspace.openTextDocument(uri);

			// Try to load the document so that its graph is created and can be used for showing definitions, descriptions etc..
			await this.contextService.loadDocument(document);
		} catch (error) {
			// VS Code may refuse to open files it considers binary (e.g., files containing
			// ASCII control characters like W3C test files). Skip these gracefully.
			console.warn(`Mentor: Skipping file ${uri.toString()} (cannot be opened as text)`);
		}
	}

	/**
	 * Index RDF cells within a notebook document.
	 * @param notebookUri The URI of the notebook file.
	 * @param force Whether to force re-indexing of already indexed cells.
	 */
	private async _indexNotebookDocument(notebookUri: vscode.Uri, force: boolean): Promise<void> {
		const notebook = await vscode.workspace.openNotebookDocument(notebookUri);

		for (const cell of notebook.getCells()) {
			if (!this.documentFactory.isTripleSourceLanguage(cell.document.languageId)) {
				continue;
			}

			const cellUri = cell.document.uri.toString();

			if (this.contextService.contexts[cellUri] && !force) {
				continue;
			}

			try {
				// Load the cell document to create its context
				await this.contextService.loadDocument(cell.document);
			} catch (error) {
				console.error(`Mentor: Failed to index notebook cell ${cellUri}:`, error);
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
		if (this._indexed) {
			return;
		}

		return new Promise((resolve) => {
			const listener = this._onDidFinishIndexing.event(() => {
				listener.dispose();
				resolve();
			});
		});
	}
}
