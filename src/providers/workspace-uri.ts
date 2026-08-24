import * as vscode from 'vscode';
import { Utils } from 'vscode-uri';
import { UserUri } from './user-uri';

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
	 * For `user:` URIs, delegates to {@link UserUri.toCanonicalString}, which applies
	 * the same authority fix — this matters because graph IRIs derived from open
	 * documents flow through this method, and a `user:///` document must produce
	 * the same graph IRI here as the settings-backed shape loader uses.
	 * For other non-workspace URIs, delegates to `toString(true)` (skip encoding).
	 * For string inputs, returns the string unchanged.
	 */
	static toCanonicalString(uri: vscode.Uri | string): string {
		if (typeof uri === 'string') {
			return uri;
		}

		if (uri.scheme === UserUri.uriScheme) {
			return UserUri.toCanonicalString(uri);
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
	 * @param fragmentOverride When provided, overrides the URI fragment (e.g. a notebook cell slug).
	 * @returns The corresponding Mentor VFS URI.
	 */
	static toWorkspaceUri(documentIri: vscode.Uri, fragmentOverride?: string): CanonicalWorkspaceUri | undefined {
		if (documentIri.scheme === this.uriScheme) {
			const result = documentIri instanceof CanonicalWorkspaceUri
				? documentIri
				: new CanonicalWorkspaceUri(documentIri);

			if (fragmentOverride !== undefined) {
				return new CanonicalWorkspaceUri(result.with({ fragment: fragmentOverride }));
			}

			return result;
		}

		// Only translate schemes that actually address workspace files. Virtual schemes
		// (user:, untitled:, mentor-template:, …) must keep their own identity — matching
		// them by path prefix would mis-map e.g. `user:///shapes/x.ttl` to a workspace URI
		// whenever the effective root path happens to be a prefix of the virtual path.
		if (!this.supportedSchemes.has(documentIri.scheme)) {
			return undefined;
		}

		const absolutePath = documentIri.path;
		const root = this.getEffectiveRootUri();

		if (root && this.isPathPrefix(root.path, absolutePath)) {
			return this.toRelativeWorkspaceUri(documentIri, root.path.length, fragmentOverride);
		}

		// Fallback: try the workspace folders when the effective root did not match.
		//
		// This is not limited to the monorepo-root case. With a `.code-workspace` file open,
		// `getEffectiveRootUri()` derives the root from `vscode.workspace.workspaceFile`, while
		// the files being mapped come from `findFiles()` over `workspaceFolders` -- two different
		// VS Code APIs whose URIs need not agree. Gating this fallback on `rootUri` skipped it in
		// exactly the configuration where it was needed, leaving every workspace file unmappable.
		for (const folder of vscode.workspace.workspaceFolders ?? []) {
			if (this.isPathPrefix(folder.uri.path, absolutePath)) {
				return this.toRelativeWorkspaceUri(documentIri, folder.uri.path.length, fragmentOverride);
			}
		}

		return undefined;
	}

	/**
	 * Builds the workspace-relative URI for a document whose path is known to start with a
	 * root path of the given length.
	 * @param documentIri The absolute document URI being mapped.
	 * @param rootPathLength The length of the matched root path.
	 * @param fragmentOverride When provided, overrides the URI fragment.
	 * @returns The workspace-relative URI.
	 */
	private static toRelativeWorkspaceUri(documentIri: vscode.Uri, rootPathLength: number, fragmentOverride?: string): CanonicalWorkspaceUri {
		return new CanonicalWorkspaceUri(vscode.Uri.from({
			scheme: this.uriScheme,
			// Sliced from the original path, so the relative path keeps the casing the file
			// system actually reports even when the prefix matched case-insensitively.
			path: documentIri.path.substring(rootPathLength),
			fragment: fragmentOverride ?? (documentIri.fragment || undefined)
		}));
	}

	/**
	 * Determines whether `path` starts with `prefix`, tolerating the case differences that occur
	 * on case-insensitive (Windows) file systems.
	 *
	 * The drive letter in particular is normalised inconsistently across the VS Code API surface:
	 * `vscode.workspace.workspaceFile` can carry `/C:/...` while `workspaceFolders` -- and every
	 * `findFiles()` result derived from them -- carries `/c:/...`. Because `Uri.toString()`
	 * lowercases the drive letter while `Uri.path` preserves it, such a mismatch is invisible in
	 * logs even though an exact prefix test fails on every single file.
	 *
	 * Case-insensitive matching is applied only to paths rooted at a Windows drive letter. POSIX
	 * paths stay case-sensitive, where `/w/File.ttl` and `/w/file.ttl` are distinct files.
	 * @param prefix The candidate prefix (a root path).
	 * @param path The path to test.
	 * @returns `true` if `path` starts with `prefix`.
	 */
	private static isPathPrefix(prefix: string, path: string): boolean {
		if (path.length < prefix.length) {
			return false;
		}

		// Comparing an equal-length slice rather than using `startsWith` keeps both operands the
		// same length, so case folding cannot shift the boundary between prefix and remainder.
		const head = path.substring(0, prefix.length);

		if (head === prefix) {
			return true;
		}

		return this.isWindowsDrivePath(prefix) && head.toLowerCase() === prefix.toLowerCase();
	}

	/**
	 * Determines whether a URI path is rooted at a Windows drive letter (e.g. `/c:/Users`), which
	 * implies a case-insensitive file system.
	 * @param path The URI path to test.
	 * @returns `true` for drive-letter paths.
	 */
	private static isWindowsDrivePath(path: string): boolean {
		return /^\/[a-zA-Z]:(\/|$)/.test(path);
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

		// `joinPath` normalizes `../` segments, so a workspace URI such as
		// `workspace:///../../etc/passwd` would otherwise resolve to a path outside the
		// workspace root. Verifying the *resolved* path stays under the root rejects path
		// traversal regardless of how it was encoded (`../`, `%2e%2e`, absolute paths).
		if (!this.isContainedIn(fileUri, root)) {
			throw new Error('Refusing to resolve workspace URI outside the workspace root: ' + workspaceUri.toString());
		}

		// Preserve the fragment (e.g., notebook cell index)
		return fileUri.with({ fragment: workspaceUri.fragment });
	}

	/**
	 * Resolves a workspace-relative URI into an absolute file system URI, returning `undefined`
	 * instead of throwing when the URI cannot be resolved or would escape the workspace root.
	 * Use this where an invalid or malicious URI should be silently skipped rather than surfaced
	 * as an error (e.g. when deciding whether to offer a document link).
	 * @param workspaceUri The workspace-relative URI.
	 * @returns The absolute file URI, or `undefined` if it cannot be safely resolved.
	 */
	static tryToFileUri(workspaceUri: vscode.Uri): vscode.Uri | undefined {
		try {
			return this.toFileUri(workspaceUri);
		} catch {
			return undefined;
		}
	}

	/**
	 * Determines whether a resolved URI is contained within a root URI (the root itself, or a
	 * descendant path). Used to prevent path traversal out of the workspace root.
	 * @param child The resolved URI to check.
	 * @param root The root URI that must contain the child.
	 * @returns `true` if `child` is `root` or a path beneath it.
	 */
	private static isContainedIn(child: vscode.Uri, root: vscode.Uri): boolean {
		if (child.scheme !== root.scheme || child.authority !== root.authority) {
			return false;
		}

		const rootPath = root.path.endsWith('/') ? root.path.slice(0, -1) : root.path;

		// The same case rules as the workspace-relative mapping apply here: a root and a child
		// that differ only in drive-letter case denote the same directory, and rejecting them
		// would make the traversal guard fire on legitimate URIs.
		if (!this.isPathPrefix(rootPath, child.path)) {
			return false;
		}

		// The child is either the root itself or a path below it -- a mere string prefix would
		// also accept a sibling such as `/workspace` for the root `/w`.
		return child.path.length === rootPath.length || child.path[rootPath.length] === '/';
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

	/**
	 * The workspace-relative path without a leading slash (e.g. `models/data.ttl`),
	 * the form used by settings keys such as validation profile include/exclude entries.
	 */
	get relativePath(): string { return this._inner.path.replace(/^\/+/, ''); }

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