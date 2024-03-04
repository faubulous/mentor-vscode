import * as vscode from 'vscode';
import * as mentor from './mentor';
import { DocumentFactory } from './document-factory';
import { DocumentContext } from './document-context';

/**
 * Maps document URIs to document contexts.
 */
export interface DocumentIndex {
	[key: string]: DocumentContext;
}

export class DocumentIndexer {
	readonly factory = new DocumentFactory();

	async indexWorkspace(): Promise<void> {
		vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: "Indexing workspace",
			cancellable: false
		}, async (progress) => {
			this.reportProgress(progress, 0);

			if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
				const startTime = performance.now();

				const workspaceUri = vscode.workspace.workspaceFolders[0].uri;

				const excludedFolders = '{' + (await mentor.getExcludePatterns(workspaceUri)).join(",") + '}';

				const uris = await vscode.workspace.findFiles("**/*.{ttl,nt,owl,trig,nq,n3,sparql}", excludedFolders);

				const tasks = uris.map(uri => async (n: number) => {
					const document = await vscode.workspace.openTextDocument(uri);
					const context = this.factory.create(document);

					await context.load(document);

					this.reportProgress(progress, Math.round((n / tasks.length) * 100));

					return { uri: uri.toString(), context };
				});

				const results = await this.runInParallel(tasks, 1);

				for (const { uri, context } of results) {
					mentor.contexts[uri] = context;
				}

				const endTime = performance.now();

				console.log(`Indexing took ${endTime - startTime} ms`);
			}

			this.reportProgress(progress, 100);
		});
	}

	async runInParallel<T>(tasks: ((n: number) => Promise<T>)[], maxParallel: number): Promise<T[]> {
		let results: T[] = [];

		for (let i = 0; i < tasks.length; i += maxParallel) {
			const chunk = tasks.slice(i, i + maxParallel);
			const chunkResults = await Promise.all(chunk.map((task, index) => task(i + index)));

			results = [...results, ...chunkResults];
		}

		return results;
	}

	reportProgress(progress: vscode.Progress<{ message?: string, increment?: number }>, increment: number): void {
		progress.report({ message: increment + "%" });
	}
}