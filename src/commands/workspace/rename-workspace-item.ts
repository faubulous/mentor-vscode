import * as vscode from 'vscode';
import { Utils } from 'vscode-uri';

// Note: This command is registered in the `WorkspaceTree` view, not through the 
// usual `commands` contribution point. This is because it needs to access the 
// tree's selection state, which is more straightforward to do in the view's 
// constructor than through a separate command handler function.

export const renameWorkspaceItem = {
	id: 'mentor.command.renameWorkspaceItem',
	/**
	 * Prompts for a new name and renames the given workspace file or folder.
	 *
	 * The rename is applied through a {@link vscode.WorkspaceEdit} so it triggers
	 * the same `onDidRenameFiles` participants as an Explorer rename — keeping
	 * SPARQL/SHACL settings and document references in sync.
	 * @param uri The node URI string of the file or folder to rename.
	 */
	handler: async (uri: string): Promise<void> => {
		const resourceUri = vscode.Uri.parse(uri);
		const currentName = decodeURIComponent(Utils.basename(resourceUri));

		if (!currentName) {
			return;
		}

		// Pre-select the name without its extension, mirroring the Explorer rename UX.
		const isDirectory = Utils.extname(resourceUri) === '';
		const extension = isDirectory ? '' : Utils.extname(resourceUri);
		const selectionEnd = extension ? currentName.length - extension.length : currentName.length;

		const newName = await vscode.window.showInputBox({
			title: isDirectory ? 'Rename Folder' : 'Rename File',
			prompt: 'Enter a new name.',
			value: currentName,
			valueSelection: [0, selectionEnd],
			validateInput: (value) => {
				const trimmed = value.trim();

				if (!trimmed) {
					return 'The name cannot be empty.';
				}

				if (/[\\/]/.test(trimmed)) {
					return 'The name cannot contain path separators.';
				}

				return undefined;
			}
		});

		const trimmedName = newName?.trim();

		if (!trimmedName || trimmedName === currentName) {
			return;
		}

		const targetUri = getRenamedUri(uri, trimmedName);

		const edit = new vscode.WorkspaceEdit();
		edit.renameFile(resourceUri, targetUri, { overwrite: false });

		await vscode.workspace.applyEdit(edit);
	}
}

/**
 * Get the URI that results from renaming a workspace item to a new 
 * name while keeping it in the same directory.
 * @param originalUri The URI string of the file or folder to rename.
 * @param newName The new name for the file or folder, without any path components.
 * @returns A new URI with the same parent directory as the original but with the last path segment replaced by the new name.
 */
export const getRenamedUri = (originalUri: string, newName: string): vscode.Uri => {
	const uri = vscode.Uri.parse(originalUri);
	const directory = Utils.dirname(uri);

	return Utils.joinPath(directory, newName);
}