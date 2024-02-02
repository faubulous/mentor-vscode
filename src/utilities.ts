import { Uri, WorkspaceFolder, workspace } from "vscode";

/**
 * Get the portion of a URI after the first occurance of '#' or the last occurance of '/'.
 * @param uri A URI.
 * @returns The label portion of the URI.
 */
export function getLabel(uri: string): string {
	const ns = getNamespaceUri(uri);

	if (ns) {
		return uri.replace(ns, "");
	} else {
		return uri;
	}
}

/**
 * Get the portion of a URI after the first occurance of '#' or the last occurance of '/'.
 * @param uri A URI.
 * @returns The namespace portion of the URI.
 */
export function getNamespaceUri(uri: string) {
	if (!uri) {
		return uri;
	}

	// Remove any query strings from the URI.
	let u = uri;
	let n = u.indexOf('?');

	if (n > -1) {
		u = uri.substring(0, n);
	}

	// Find the first occurance of '#' and return the substring up to that point.
	n = u.indexOf('#');

	if (n > -1) {
		return u.substring(0, n + 1);
	}

	// Find the last occurance of '/' and return the substring up to that point.
	n = u.lastIndexOf('/');

	// Only return the substring if it is not the 'http://' or 'https://' protocol.
	if (n > 8) {
		return u.substring(0, n + 1);
	} else {
		return u + "/";
	}
}

/**
 * Get a transformed version of the URI that can be used as a JSON identifier which only contains letters, numbers and dots.
 * @param uri A URI.
 * @returns A transformed version which only contains letters, numbers and dots.
 */
export function toJsonId(uri: string): string | undefined {
	if (!uri) {
		return uri;
	}

	let u = uri.split('//')[1];

	if (u) {
		u = u.replace(/[^a-zA-Z0-9]/g, '.');

		return u.endsWith('.') ? u.slice(0, -1) : u;
	} else {
		return undefined;
	}
}

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