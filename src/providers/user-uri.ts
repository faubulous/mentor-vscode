import * as vscode from 'vscode';

/**
 * A helper class for the `user:///` URI scheme of the Mentor virtual file system.
 *
 * User URIs address files whose content is stored in the *user-level* value of a
 * Mentor settings key (see `SettingsFileStore`), so they are machine- and
 * workspace-independent and travel with the user's settings via Settings Sync.
 * A user URI serves double duty: it is the document URI served by the
 * `UserFileSystemProvider` *and* the graph IRI the file's triples are stored
 * under in the RDF store — the same convention `workspace:///` URIs follow for
 * workspace files.
 */
export class UserUri {
	/**
	 * The URI scheme for the user-scope Mentor virtual file system URIs.
	 */
	static readonly uriScheme = 'user';

	/**
	 * Returns the canonical string representation of a user URI.
	 *
	 * This is needed because `vscode.Uri.toString()` drops the empty authority,
	 * serializing `user:///path` as `user:/path`. This method ensures the
	 * canonical triple-slash form `user:///path` is always produced.
	 *
	 * For non-user URIs, delegates to `toString(true)` (skip encoding).
	 * For string inputs, returns the string unchanged.
	 */
	static toCanonicalString(uri: vscode.Uri | string): string {
		if (typeof uri === 'string') {
			return uri;
		}

		if (uri.scheme !== this.uriScheme) {
			return uri.toString(true);
		}

		// uri.toString() produces properly percent-encoded path segments but drops the empty
		// authority, serialising `user:///path` as `user:/path`. Fix the authority component.
		return uri.toString().replace(/^user:\/(?!\/)/, 'user:///');
	}

	/**
	 * Indicates whether a URI or URI string uses the user scheme.
	 */
	static isUserUri(uri: vscode.Uri | string): boolean {
		return typeof uri === 'string'
			? uri.startsWith(`${this.uriScheme}:`)
			: uri.scheme === this.uriScheme;
	}

	/**
	 * Returns the canonical user URI string of a file in a settings-backed folder.
	 * @param folder The virtual folder path, e.g. `/shapes`.
	 * @param fileName The file name within the folder, e.g. `my-shapes.ttl`.
	 */
	static forFile(folder: string, fileName: string): string {
		const prefix = folder.startsWith('/') ? folder : `/${folder}`;

		// The empty authority ('//') plus the leading slash of the folder path
		// yields the canonical triple-slash form, e.g. 'user:///shapes/my.ttl'.
		return `${this.uriScheme}://${prefix}/${fileName}`;
	}
}
