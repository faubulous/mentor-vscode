import { Uri, WorkspaceFolder, workspace } from "vscode";

export function getSortedWorkspaceFolders(): string[] {
	const folders = workspace.workspaceFolders ? workspace.workspaceFolders.map(folder => {
		let result = folder.uri.toString();

		if (result.charAt(result.length - 1) !== '/') {
			result = result + '/';
		}

		return result;
	}).sort((a, b) => { return a.length - b.length; }) : [];

	return folders;
}

/**
 * Returns the outermost workspace folder if there are nested workspace folders.
 * @param folder The current workspace folder.
 * @returns The outermost workspace folder or the given workspace folder if there are no nested workspace folders.
 */
export function getOuterMostWorkspaceFolder(folder: WorkspaceFolder): WorkspaceFolder {
	const sorted = getSortedWorkspaceFolders();

	for (const element of sorted) {
		let uri = folder.uri.toString();

		if (uri.charAt(uri.length - 1) !== '/') {
			uri = uri + '/';
		}

		if (uri.startsWith(element)) {
			return workspace.getWorkspaceFolder(Uri.parse(element))!;
		}
	}

	return folder;
}

export function findAllParsableDocuments(): Promise<Uri[]> {
	return new Promise<Uri[]>((resolve, reject) => {
		if (!workspace.name) {
			resolve([]);
		} else {
			const configuration = workspace.getConfiguration();

			const include = configuration.get("refactor-css.include") as string;
			const exclude = configuration.get("refactor-css.exclude") as string;

			resolve(workspace.findFiles(include, exclude));
		}
	});
}