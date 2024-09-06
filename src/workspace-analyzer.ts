import * as vscode from 'vscode';
import * as mentor from './mentor';
import * as path from 'path';
import { DocumentFactory } from './document-factory';

/**
 * A helper class that analyzes the workspace for problems.
 */
export class WorkspaceAnalyzer {
	/**
	 * The document factory for creating document contexts.
	 */
	private readonly _documentFactory = new DocumentFactory();

	/**
	 * Analyzes the workspace for problems.
	 */
	async analyzeWorkspace() {
		vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: "Analyzing workspace",
			cancellable: true
		}, async (progress) => {
			vscode.commands.executeCommand('setContext', 'mentor.workspace.isAnalyzing', true);

			this.reportProgress(progress, 0);

			if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
				const workspaceUri = vscode.workspace.workspaceFolders[0].uri;

				const excludedFolders = '{' + (await mentor.getExcludePatterns(workspaceUri)).join(",") + '}';

				const includedExtensions = Array.from(this._documentFactory.supportedExtensions).join(',');

				let uris = await vscode.workspace.findFiles("**/*.{" + includedExtensions + "}", excludedFolders);

				// Only index files that *end* with the supported extensions. Glob also matches URIs that contain the extensions.
				uris = uris.filter(uri => {
					const ext = path.extname(uri.fsPath).toLowerCase();

					return ext && this._documentFactory.supportedExtensions.has(ext);
				});

				for (let i = 0; i < uris.length; i++) {
					const uri = uris[i];

					// Open the document to trigger the language server to analyze it.
					await vscode.workspace.openTextDocument(uri);

					this.reportProgress(progress, Math.round((i / uris.length) * 100));
				}
			}

			this.reportProgress(progress, 100);

			vscode.commands.executeCommand('setContext', 'mentor.workspace.isAnalyzing', false);
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
}