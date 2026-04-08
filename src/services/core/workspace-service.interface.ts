import * as vscode from 'vscode';

/**
 * Describes a VS Code workspace file discovered in the project directory.
 */
export interface WorkspaceDescriptor {
	/**
	 * A unique identifier derived from the workspace filename (without the `.code-workspace` extension).
	 */
	readonly id: string;

	/**
	 * The URI of the workspace file.
	 */
	readonly uri: vscode.Uri;

	/**
	 * The absolute file system path of the workspace file.
	 */
	readonly absolutePath: string;

	/**
	 * The file system path relative to the project root, using forward slashes.
	 */
	readonly relativePath: string;

	/**
	 * The `mentor.workspace.rootOffset` setting from the workspace file, if present.
	 * A relative path from the `.code-workspace` file's directory to the monorepo root.
	 * Defaults to `undefined` when no offset is configured.
	 */
	readonly rootOffset: string | undefined;

	/**
	 * The resolved monorepo root URI computed from the workspace file location and `rootOffset`.
	 * When `rootOffset` is `undefined`, this is `undefined` as well.
	 */
	readonly rootUri: vscode.Uri | undefined;
}

/**
 * Service for discovering VS Code workspace files in the project directory
 * and providing fast access to their identifiers and paths.
 */
export interface IWorkspaceService {
	/**
	 * The resolved monorepo root URI for the currently active workspace.
	 * Derived from the active `.code-workspace` file's location and its `rootOffset` setting.
	 * `undefined` when no workspace file is active or no `rootOffset` is configured.
	 */
	readonly activeRootUri: vscode.Uri | undefined;

	/**
	 * All discovered workspace descriptors.
	 */
	readonly workspaces: ReadonlyArray<WorkspaceDescriptor>;

	/**
	 * Returns the workspace descriptor for the given ID, or `undefined` if not found.
	 * @param id The workspace identifier.
	 */
	getWorkspaceById(id: string): WorkspaceDescriptor | undefined;

	/**
	 * Discovers all `.code-workspace` files in the project directory and parses their settings.
	 */
	discoverWorkspaces(): Promise<void>;
}
