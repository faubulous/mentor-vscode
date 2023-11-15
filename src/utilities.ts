import { Uri, Webview, WorkspaceFolder, workspace } from "vscode";

/**
 * A helper function which will get the webview URI of a given file or resource.
 *
 * @remarks This URI can be used within a webview's HTML as a link to the
 * given file/resource.
 *
 * @param webview A reference to the extension webview
 * @param extensionUri The URI of the directory containing the extension
 * @param pathList An array of strings representing the path to a file/resource
 * @returns A URI pointing to the file/resource
 */
export function getUri(webview: Webview, extensionUri: Uri, pathList: string[]) {
	return webview.asWebviewUri(Uri.joinPath(extensionUri, ...pathList));
}

/**
 * A helper function that returns a unique alphanumeric identifier called a nonce.
 *
 * @remarks This function is primarily used to help enforce content security
 * policies for resources/scripts being executed in a webview context.
 *
 * @returns A nonce
 */
export function getNonce() {
	let text = "";
	const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}

	return text;
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
	u = u.replace(/[^a-zA-Z0-9]/g, '.');

	return u.endsWith('.') ? u.slice(0, -1) : u;
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