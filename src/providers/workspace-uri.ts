import * as vscode from 'vscode';
import { Utils } from 'vscode-uri';

/**
 * A helper class which provides methods to convert between absolute file system 
 * URIs and workspace-relative URIs in the Mentor virtual file system. This is used
 * to provide shortened document URIs that are also resolvable when stored in a
 * version control system repository.
 * 
 * When a monorepo root is configured (via the `mentor.workspace.rootOffset` setting in
 * a `.code-workspace` file), all workspace-relative paths are resolved against that root.
 * This ensures that graph IRIs are identical across different workspaces that share the 
 * same monorepo root.
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
	 * A set of URI schemes that can be translated to workspace-relative URIs.
	 */
	static readonly supportedSchemes = new Set<string>([
		"file",
		"vscode-notebook-cell",
		"vscode-vfs"
	]);

	/**
	 * The monorepo root URI to resolve workspace-relative paths against.
	 * When set, all workspace URIs are relative to this root instead of the first workspace folder.
	 * Set by `WorkspaceService` after discovery.
	 */
	static rootUri: vscode.Uri | undefined;

	/**
	 * Returns the canonical string representation of a workspace URI.
	 * 
	 * This is needed because `vscode.Uri.toString()` drops the empty authority,
	 * serializing `workspace:///path` as `workspace:/path`. This method ensures the
	 * canonical triple-slash form `workspace:///path` is always produced.
	 * 
	 * For non-workspace URIs, delegates to `toString(true)` (skip encoding).
	 * For string inputs, returns the string unchanged.
	 */
	static toCanonicalString(uri: vscode.Uri | string): string {
		if (typeof uri === 'string') {
			return uri;
		}

		if (uri.scheme !== this.uriScheme) {
			return uri.toString(true);
		}

		// uri.toString() produces properly percent-encoded path segments but drops the empty authority,
		// serialising `workspace:///path` as `workspace:/path`. Fix the authority component.
		return uri.toString().replace(/^workspace:\/(?!\/)/, 'workspace:///');
	}

	/**
	 * Returns the effective root URI for workspace-relative path resolution.
	 *
	 * Priority:
	 * 1. Explicit monorepo root (`rootUri` set via `mentor.workspace.rootOffset`).
	 * 2. Parent directory of the active `.code-workspace` file — this ensures that
	 *    folder names are preserved in workspace URIs (e.g. `workspace:///examples/file.ttl`
	 *    instead of `workspace:///file.ttl`).
	 * 3. First workspace folder (single-folder workspace, no workspace file).
	 */
	static getEffectiveRootUri(): vscode.Uri | undefined {
		if (this.rootUri) {
			return this.rootUri;
		}

		const folders = vscode.workspace.workspaceFolders;

		if (!folders || folders.length === 0) {
			return undefined;
		}

		// When a .code-workspace file is open, its parent directory is the natural root —
		// all folder paths in the workspace file are relative to it.
		const workspaceFile = vscode.workspace.workspaceFile;

		if (workspaceFile) {
			return Utils.dirname(workspaceFile);
		}

		return folders[0].uri;
	}

	/**
	 * Converts an absolute file system URI (file://..) to a workspace-relative Mentor VFS URI that
	 * can be resolved by the Mentor document link provider and the Mentor virtual file system provider.
	 * @param documentIri The absolute file system URI to convert.
	 * @returns The corresponding Mentor VFS URI.
	 */
	static toWorkspaceUri(documentIri: vscode.Uri): CanonicalWorkspaceUri | undefined {
		if (documentIri.scheme === this.uriScheme) {
			return documentIri instanceof CanonicalWorkspaceUri
				? documentIri
				: new CanonicalWorkspaceUri(documentIri);
		}

		const root = this.getEffectiveRootUri();

		if (!root) {
			return undefined;
		}

		const absolutePath = documentIri.path;
		const rootPath = root.path;

		if (absolutePath.startsWith(rootPath)) {
			const relativePath = absolutePath.substring(rootPath.length);

			return new CanonicalWorkspaceUri(vscode.Uri.from({
				scheme: this.uriScheme,
				path: relativePath,
				fragment: documentIri.fragment || undefined
			}));
		}

		// Fallback: try workspace folders if the monorepo root didn't match
		// (e.g. file is outside the monorepo root but inside a workspace folder).
		if (this.rootUri) {
			const folders = vscode.workspace.workspaceFolders;

			if (folders) {
				for (const folder of folders) {
					if (absolutePath.startsWith(folder.uri.path)) {
						const relativePath = absolutePath.substring(folder.uri.path.length);

						return new CanonicalWorkspaceUri(vscode.Uri.from({
							scheme: this.uriScheme,
							path: relativePath,
							fragment: documentIri.fragment || undefined
						}));
					}
				}
			}
		}

		return undefined;
	}

	/**
	 * Resolves a workspace-relative URI into an absolute file system URI (file://..).
	 * @param workspaceUri The workspace-relative URI.
	 * @returns The absolute file URI.
	 */
	static toFileUri(workspaceUri: vscode.Uri): vscode.Uri {
		if (workspaceUri.scheme !== this.uriScheme) {
			throw new Error('Cannot convert non-workspace URI to file URI: ' + workspaceUri.toString());
		}

		const root = this.getEffectiveRootUri();

		if (!root) {
			throw new Error('No workspace folders are open.');
		}

		const path = workspaceUri.path.startsWith('/') ? workspaceUri.path.substring(1) : workspaceUri.path;
		const fileUri = vscode.Uri.joinPath(root, path);

		// Preserve the fragment (e.g., notebook cell index)
		return fileUri.with({ fragment: workspaceUri.fragment });
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

/**
 * A workspace-scheme URI whose `toString()` always returns the canonical `workspace:///path`
 * form. Obtain instances through {@link WorkspaceUri.toWorkspaceUri}.
 *
 * `vscode.Uri.toString()` drops the empty authority component for `workspace:` URIs and returns
 * the deprecated `workspace:/path` form. This class encodes the correct serialisation directly,
 * so callers can safely use `.toString()` without any extra conversion step.
 */
export class CanonicalWorkspaceUri {
	constructor(private readonly _inner: vscode.Uri) {}

	get scheme(): string { return this._inner.scheme; }
	get authority(): string { return this._inner.authority; }
	get path(): string { return this._inner.path; }
	get query(): string { return this._inner.query; }
	get fragment(): string { return this._inner.fragment; }
	get fsPath(): string { return this._inner.fsPath; }

	with(change: { scheme?: string; authority?: string; path?: string; query?: string; fragment?: string }): vscode.Uri {
		return this._inner.with(change);
	}

	/** Always returns the canonical `workspace:///path` form with percent-encoded path segments. */
	toString(_skipEncoding?: boolean): string {
		// this._inner.toString() produces properly percent-encoded path segments but drops the empty
		// authority, serialising `workspace:///path` as `workspace:/path`. Fix the authority component.
		return this._inner.toString().replace(/^workspace:\/(?!\/)/, 'workspace:///');
	}

	toJSON(): object {
		return this._inner.toJSON();
	}
}