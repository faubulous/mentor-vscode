import * as vscode from 'vscode';
import * as mentor from './mentor';
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
	readonly factory = new DocumentFactory();

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
	async indexWorkspace(): Promise<void> {
		vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: "Indexing workspace",
			cancellable: false
		}, async (progress) => {
			vscode.commands.executeCommand('setContext', 'mentor.workspace.isIndexing', true);

			this.reportProgress(progress, 0);

			if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
				const startTime = performance.now();

				const workspaceUri = vscode.workspace.workspaceFolders[0].uri;

				const excludedFolders = '{' + (await mentor.getExcludePatterns(workspaceUri)).join(",") + '}';

				const uris = await vscode.workspace.findFiles("**/*.{ttl,nt,owl,trig,nq,n3,sparql}", excludedFolders);

				const tasks = uris.map(uri => async (n: number) => {
					const data = new TextDecoder().decode(await vscode.workspace.fs.readFile(uri));

					const context = this.factory.create(uri);

					await context.load(uri, data, false);

					this.reportProgress(progress, Math.round((n / tasks.length) * 100));

					return { uri: uri.toString(), context };
				});

				const results = await this.runInParallel(tasks, 2);

				for (const { uri, context } of results) {
					mentor.contexts[uri] = context;
				}

				const endTime = performance.now();

				console.log(`Indexing took ${endTime - startTime} ms`);
			}

			this.reportProgress(progress, 100);

			vscode.commands.executeCommand('setContext', 'mentor.workspace.isIndexing', false);

			this._onDidFinishIndexing.fire(true);
		});
	}

	/**
	 * Executes a set of tasks in parallel.
	 * @param tasks The tasks to be executed.
	 * @param maxParallel The maximum number of tasks to run in parallel.
	 * @returns The results of the tasks.
	 */
	async runInParallel<T>(tasks: ((n: number) => Promise<T>)[], maxParallel: number): Promise<T[]> {
		let results: T[] = [];

		for (let i = 0; i < tasks.length; i += maxParallel) {
			const chunk = tasks.slice(i, i + maxParallel);
			const chunkResults = await Promise.all(chunk.map((task, index) => task(i + index)));

			results = [...results, ...chunkResults];
		}

		return results;
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