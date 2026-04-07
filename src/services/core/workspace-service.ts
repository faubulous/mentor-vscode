import * as vscode from 'vscode';
import { WorkspaceDescriptor, IWorkspaceService } from './workspace-service.interface';

/**
 * Service for discovering VS Code workspace files in the project directory
 * and providing fast access to their identifiers and paths.
 */
export class WorkspaceService implements IWorkspaceService {
	private _workspaces: WorkspaceDescriptor[] = [];
	
	private readonly _workspaceMap = new Map<string, WorkspaceDescriptor>();

	get workspaces(): ReadonlyArray<WorkspaceDescriptor> {
		return this._workspaces;
	}

	getWorkspaceById(id: string): WorkspaceDescriptor | undefined {
		return this._workspaceMap.get(id);
	}

	async discoverWorkspaces(): Promise<void> {
		this._workspaces = [];
		this._workspaceMap.clear();

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
					const descriptor = WorkspaceService.createDescriptor(fileUri, folder.uri);

					this._workspaces.push(descriptor);
					this._workspaceMap.set(descriptor.id, descriptor);
					break;
				}
			}
		}
	}

	/**
	 * Creates a workspace descriptor from a file URI and workspace root URI.
	 * @param fileUri The URI of the `.code-workspace` file.
	 * @param rootUri The URI of the workspace root folder.
	 */
	static createDescriptor(fileUri: vscode.Uri, rootUri: vscode.Uri): WorkspaceDescriptor {
		const rootPath = rootUri.path.endsWith('/')
			? rootUri.path
			: rootUri.path + '/';

		const relativePath = fileUri.path.startsWith(rootPath)
			? fileUri.path.substring(rootPath.length)
			: fileUri.path;

		const parts = relativePath.split('/');
		const fileName = parts[parts.length - 1];
		const id = fileName.replace(/\.code-workspace$/, '');

		return {
			id,
			uri: fileUri,
			absolutePath: fileUri.fsPath,
			relativePath,
		};
	}
}
