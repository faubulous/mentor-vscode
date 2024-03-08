import * as vscode from 'vscode';
import * as mentor from './mentor';

/**
 * A helper class that analyzes the workspace for problems.
 */
export class WorkspaceAnalyzer {
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
				const startTime = performance.now();

				const workspaceUri = vscode.workspace.workspaceFolders[0].uri;

				const excludedFolders = '{' + (await mentor.getExcludePatterns(workspaceUri)).join(",") + '}';

				const uris = await vscode.workspace.findFiles("**/*.{ttl,nt,owl,trig,nq,n3,sparql}", excludedFolders);

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