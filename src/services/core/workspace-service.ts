import * as vscode from 'vscode';
import { Utils } from 'vscode-uri';
import { WorkspaceDescriptor, IWorkspaceService } from './workspace-service.interface';

/**
 * Service for discovering VS Code workspace files in the project directory
 * and providing fast access to their identifiers and paths.
 */
export class WorkspaceService implements IWorkspaceService {
	private _workspaces: WorkspaceDescriptor[] = [];

	private readonly _workspaceMap = new Map<string, WorkspaceDescriptor>();

	private _activeRootUri: vscode.Uri | undefined;

	get activeRootUri(): vscode.Uri | undefined {
		return this._activeRootUri;
	}

	get workspaces(): ReadonlyArray<WorkspaceDescriptor> {
		return this._workspaces;
	}

	getWorkspaceById(id: string): WorkspaceDescriptor | undefined {
		return this._workspaceMap.get(id);
	}

	async discoverWorkspaces(): Promise<void> {
		this._workspaces = [];
		this._workspaceMap.clear();
		this._activeRootUri = undefined;

		const folders = vscode.workspace.workspaceFolders;

		if (!folders || folders.length === 0) {
			return;
		}

		const files = await vscode.workspace.findFiles('**/*.code-workspace');

		for (const fileUri of files) {
			for (const folder of folders) {
				const folderPath = folder.uri.path.endsWith('/')
					? folder.uri.path
					: folder.uri.path + '/';

				if (fileUri.path.startsWith(folderPath)) {
					const content = await WorkspaceService.readWorkspaceFile(fileUri);
					const descriptor = WorkspaceService.createDescriptor(fileUri, folder.uri, content);

					this._workspaces.push(descriptor);
					this._workspaceMap.set(descriptor.id, descriptor);
					break;
				}
			}
		}

		// Determine the active root URI from the currently-open workspace file.
		this._activeRootUri = this._resolveActiveRootUri();
	}

	/**
	 * Determines the monorepo root URI for the currently active workspace.
	 * Uses `vscode.workspace.workspaceFile` to find the active `.code-workspace` descriptor.
	 */
	private _resolveActiveRootUri(): vscode.Uri | undefined {
		const workspaceFile = vscode.workspace.workspaceFile;

		if (!workspaceFile) {
			return undefined;
		}

		const activeId = WorkspaceService.getIdFromFilename(workspaceFile.path);
		const descriptor = this._workspaceMap.get(activeId);

		return descriptor?.rootUri;
	}

	/**
	 * Reads and parses a `.code-workspace` JSON file.
	 * Returns `undefined` if the file cannot be read or parsed.
	 */
	static async readWorkspaceFile(fileUri: vscode.Uri): Promise<WorkspaceFileContent | undefined> {
		try {
			const bytes = await vscode.workspace.fs.readFile(fileUri);
			const text = new TextDecoder().decode(bytes);

			return JSON.parse(text);
		} catch {
			return undefined;
		}
	}

	/**
	 * Extracts the workspace ID from a filename path.
	 */
	static getIdFromFilename(path: string): string {
		const parts = path.split('/');
		const fileName = parts[parts.length - 1];

		return fileName.replace(/\.code-workspace$/, '');
	}

	/**
	 * Resolves the monorepo root URI from a `.code-workspace` file location and a root offset.
	 * @param workspaceFileUri The URI of the `.code-workspace` file.
	 * @param rootOffset A relative path from the workspace file's directory to the monorepo root (e.g. `"."` or `".."`).
	 * @returns The resolved root URI, with a normalised path (no trailing segments like `/..`).
	 */
	static resolveRootUri(workspaceFileUri: vscode.Uri, rootOffset: string): vscode.Uri {
		const workspaceDir = Utils.dirname(workspaceFileUri);

		return Utils.resolvePath(workspaceDir, rootOffset);
	}

	/**
	 * Creates a workspace descriptor from a file URI, workspace root URI, and parsed file content.
	 * @param fileUri The URI of the `.code-workspace` file.
	 * @param folderUri The URI of the workspace folder containing the file.
	 * @param content Parsed content of the `.code-workspace` file, if available.
	 */
	static createDescriptor(fileUri: vscode.Uri, folderUri: vscode.Uri, content?: WorkspaceFileContent): WorkspaceDescriptor {
		const rootPath = folderUri.path.endsWith('/')
			? folderUri.path
			: folderUri.path + '/';

		const relativePath = fileUri.path.startsWith(rootPath)
			? fileUri.path.substring(rootPath.length)
			: fileUri.path;

		const id = WorkspaceService.getIdFromFilename(fileUri.path);
		const rootOffset = content?.settings?.['mentor.workspace.rootOffset'];
		const rootUri = rootOffset ? WorkspaceService.resolveRootUri(fileUri, rootOffset) : undefined;

		return {
			id,
			uri: fileUri,
			absolutePath: fileUri.fsPath,
			relativePath,
			rootOffset,
			rootUri,
		};
	}
}

/**
 * Minimal shape of a `.code-workspace` JSON file, covering only the fields we need.
 */
export interface WorkspaceFileContent {
	folders?: { path: string }[];
	settings?: { [key: string]: any };
}
