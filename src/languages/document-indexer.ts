import * as vscode from 'vscode';
import * as mentor from '../mentor';
import { DocumentFactory } from './document-factory';
import { DocumentContext } from './document-context';

/**
 * Maps document URIs to document contexts.
 */
export interface DocumentIndex {
	[key: string]: DocumentContext;
}

export class DocumentIndexer {
	readonly message = "Indexing workspace..";

	readonly factory = new DocumentFactory();

	async indexWorkspace(): Promise<void> {
		vscode.window.withProgress({
			location: vscode.ProgressLocation.Window,
			title: "Indexing workspace",
			cancellable: false
		}, async (progress) => {
			this.reportProgress(progress, 0);

			const startTime = performance.now();

			const uris = await vscode.workspace.findFiles("**/*.{ttl,nt,owl,trig,nq,n3,sparql}", "**/node_modules/**");

			const tasks = uris.map(uri => async () => {
				const document = await vscode.workspace.openTextDocument(uri);
				const context = this.factory.create(document);

				await context.load(document);

				return { uri: uri.toString(), context };
			});

			const results = await this.runInParallel(tasks, 4, progress);

			for (const { uri, context } of results) {
				mentor.contexts[uri] = context;
			}

			const endTime = performance.now();

			console.log(`Indexing took ${endTime - startTime} ms`);

			this.reportProgress(progress, 100);
		});
	}

	async runInParallel<T>(tasks: (() => Promise<T>)[], maxParallel: number, progress: vscode.Progress<{ message?: string, increment?: number }>): Promise<T[]> {
		let results: T[] = [];

		for (let i = 0; i < tasks.length; i += maxParallel) {
			const chunk = tasks.slice(i, i + maxParallel);
			const chunkResults = await Promise.all(chunk.map(task => task()));

			results = [...results, ...chunkResults];

			this.reportProgress(progress, Math.round((results.length / tasks.length) * 100));
		}

		return results;
	}

	reportProgress(progress: vscode.Progress<{ message?: string, increment?: number }>, increment: number): void {
		progress.report({ message: increment + "%" });
	}
}