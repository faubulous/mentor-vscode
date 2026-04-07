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
}

/**
 * Service for discovering VS Code workspace files in the project directory
 * and providing fast access to their identifiers and paths.
 */
export interface IWorkspaceService {
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
	 * Discovers all `.code-workspace` files in the project directory.
	 */
	discoverWorkspaces(): Promise<void>;
}
