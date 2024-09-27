import * as vscode from 'vscode';
import { mentor } from './mentor';
import { DocumentFactory } from './document-factory';
import { DocumentContext } from './document-context';

/**
 * Maps document URIs to RDF document contexts.
 */
export interface DocumentIndex {
	[key: string]: DocumentContext;
}

/**
 * Indexes RDF documents in the current workspace.
 */
export class DocumentIndexer {
	/**
	 * The document factory for creating document contexts.
	 */
	private readonly _documentFactory = new DocumentFactory();

	/**
	 * Indicates if all workspace files have been indexed.
	 */
	private _indexed = false;

	/**
	 * An event that is fired when all workspace files have been indexed.
	 */
	private readonly _onDidFinishIndexing = new vscode.EventEmitter<boolean>();

	constructor() {
		vscode.commands.executeCommand('setContext', 'mentor.workspace.isIndexing', false);
	}

	/**
	 * Builds an index of all RDF resources the current workspace.
	 */
	async indexWorkspace(force: boolean = false): Promise<void> {
		vscode.window.withProgress({
			location: vscode.ProgressLocation.Window,
			title: "Indexing workspace",
			cancellable: false
		}, async (progress) => {
			vscode.commands.executeCommand('setContext', 'mentor.workspace.isIndexing', true);

			this.reportProgress(progress, 0);

			// The default value is set to Number.MAX_SAFE_INTEGER to disable the 
			// file size limit and make issues with the configuration more visible.
			const maxSize = mentor.configuration.get<number>('index.maxFileSize', Number.MAX_SAFE_INTEGER);

			if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
				const startTime = performance.now();

				const workspaceUri = vscode.workspace.workspaceFolders[0].uri;

				const excludedFolders = '{' + (await mentor.getExcludePatterns(workspaceUri)).join(",") + '}';

				const includedExtensions = Object.keys(this._documentFactory.supportedExtensions).join(',');

				let uris = await vscode.workspace.findFiles("**/*{" + includedExtensions + "}", excludedFolders);

				// Only index files that *end* with the supported extensions. Glob also matches URIs that contain the extensions.
				uris = uris.filter(uri => this._documentFactory.isSupportedFile(uri));

				for (let i = 0; i < uris.length; i++) {
					const uri = uris[i];
					const u = uri.toString();

					if (mentor.contexts[u] && !force) {
						continue;
					}

					const size = (await vscode.workspace.fs.stat(uri)).size;

					if (size > maxSize && !force) {
						console.log(`Mentor: Skipping large file ${uri.toString()} (${size} bytes)`);
						continue;
					}

					// Open the document to trigger the language server to analyze it.
					await vscode.workspace.openTextDocument(uri);

					this.reportProgress(progress, Math.round(((i + 1) / uris.length) * 100));
				}

				const endTime = performance.now();

				console.log(`Mentor: Indexing took ${endTime - startTime} ms`);
			}

			this._indexed = true;

			this.reportProgress(progress, 100);

			vscode.commands.executeCommand('setContext', 'mentor.workspace.isIndexing', false);

			this._onDidFinishIndexing.fire(true);
		});
	}

	/**
	 * Reports progress to the user.
	 * @param progress The progress to report.
	 * @param increment The increment to report.
	 */
	reportProgress(progress: vscode.Progress<{ message?: string, increment?: number }>, increment: number): void {
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