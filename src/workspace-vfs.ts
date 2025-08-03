import * as vscode from 'vscode';

/**
 * A helper class which provides methods to convert between absolute file system 
 * URIs and workspace-relative URIs in the Mentor virtual file system. This is used
 * to provide shortened document URIs that can be resolved when the repository code
 * is checked-out on different systems.
 */
export class WorkspaceVfs {
	/**
	 * The URI scheme for the workspace relative Mentor virtual file system URIs.
	 */
	static readonly uriScheme = 'mentor-vfs';

	/**
	 * A regular expression to match Mentor VFS URIs in text documents.
	 */
	static readonly uriRegex = `${this.uriScheme}://[^\\s>]+`;

	/**
	 * Converts an absolute file system URI (file://..) to a workspace-relative Mentor VFS URI that
	 * can be resolved by the Mentor document link provider and the Mentor virtual file system provider.
	 * @param fileUri The absolute file system URI to convert.
	 * @returns The corresponding Mentor VFS URI.
	 */
	static toRelativeUri(fileUri: vscode.Uri): vscode.Uri {
		const workspaceFolders = vscode.workspace.workspaceFolders;

		if (!workspaceFolders || workspaceFolders.length === 0) {
			throw new Error('No workspace folders are open.');
		}

		const absolutePath = fileUri.fsPath;

		for (const workspaceFolder of workspaceFolders) {
			const workspacePath = workspaceFolder.uri.fsPath;

			if (absolutePath.startsWith(workspacePath)) {
				const relativePath = absolutePath.substring(workspacePath.length);

				return vscode.Uri.parse(`${this.uriScheme}://${relativePath}`);
			}
		}

		throw new Error('URI is not within a workspace folder: ' + fileUri.toString());
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
}