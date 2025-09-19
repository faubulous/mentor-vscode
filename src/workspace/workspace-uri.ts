import * as vscode from 'vscode';

/**
 * A helper class which provides methods to convert between absolute file system 
 * URIs and workspace-relative URIs in the Mentor virtual file system. This is used
 * to provide shortened document URIs that are also resolvable when stored in a
 * version control system repository.
 * 
 * @note We need vscode.workspaces here to resolve the URIs. So this helper cannot be used
 * in webview or LSP processes.
 */
export class WorkspaceUri {
	/**
	 * The URI scheme for the workspace relative Mentor virtual file system URIs.
	 */
	static readonly uriScheme = 'workspace';

	/**
	 * A regular expression to match Mentor VFS URIs in text documents.
	 * @note This is intentionally a string so that any modifiers for the evaluation can be easily applied as needed.
	 */
	static readonly uriRegex = `${this.uriScheme}://[^\\s>]+`;

	/**
	 * Converts an absolute file system URI (file://..) to a workspace-relative Mentor VFS URI that
	 * can be resolved by the Mentor document link provider and the Mentor virtual file system provider.
	 * @param uri The absolute file system URI to convert.
	 * @returns The corresponding Mentor VFS URI.
	 */
	static toWorkspaceUri(documentIri: vscode.Uri): vscode.Uri | undefined {
		if(documentIri.scheme === this.uriScheme) {
			return documentIri;
		}

		const workspaceFolders = vscode.workspace.workspaceFolders;

		if (!workspaceFolders || workspaceFolders.length === 0) {
			return undefined;
		}

		const absolutePath = documentIri.path;

		for (const workspaceFolder of workspaceFolders) {
			const workspacePath = workspaceFolder.uri.fsPath;

			if (absolutePath.startsWith(workspacePath)) {
				const relativePath = absolutePath.substring(workspacePath.length);

				return vscode.Uri.parse(`${this.uriScheme}://${relativePath}`);
			}
		}
	}

	/**
	 * Resolves a workspace-relative URI into an absolute file system URI (file://..).
	 * @param workspaceUri The workspace-relative URI.
	 * @returns The absolute file URI.
	 */
	static toFileUri(workspaceUri: vscode.Uri): vscode.Uri {
		const workspaceFolders = vscode.workspace.workspaceFolders;

		if (!workspaceFolders || workspaceFolders.length === 0) {
			throw new Error('No workspace folders are open.');
		}

		const segments = [
			workspaceUri.authority, // Note: the authority can be used to identify the workspace, if needed.
			workspaceUri.path.startsWith('/') ? workspaceUri.path.substring(1) : workspaceUri.path
		];

		for (const workspaceFolder of workspaceFolders) {
			const targetUri = vscode.Uri.joinPath(workspaceFolder.uri, ...segments);

			return targetUri;
		}

		// If multiple workspace folders, default to the first one
		return vscode.Uri.joinPath(workspaceFolders[0].uri, ...segments);
	}

	static toNotebookCellUri(workspaceUri: vscode.Uri): vscode.Uri {
		if (workspaceUri.scheme !== this.uriScheme) {
			throw new Error('Cannot convert non-workspace URI to notebook cell URI: ' + workspaceUri.toString());
		}

		if (!workspaceUri.fragment) {
			throw new Error('Workspace URI does not have a fragment for the notebook cell: ' + workspaceUri.toString());
		}

		const fileUri = this.toFileUri(workspaceUri);

		return vscode.Uri.parse(`vscode-notebook-cell://${fileUri.authority}${fileUri.path}#${workspaceUri.fragment}`);
	}
}