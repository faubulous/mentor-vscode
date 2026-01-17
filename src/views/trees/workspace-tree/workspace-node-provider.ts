import * as vscode from 'vscode';
import { Utils } from 'vscode-uri';
import { mentor } from '@src/mentor';

// For a complete implementation of the FileSystemProvider API, see:
// https://github.com/boltex/revealRangeTest/blob/main/src/fileExplorer.ts#L185

/**
 * A tree node provider for RDF files in the Visual Studio Code workspace.
 */
export class WorkspaceNodeProvider implements vscode.TreeDataProvider<string> {

	private _onDidChangeTreeData = new vscode.EventEmitter<string | undefined>();

	readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

	constructor() {
		// Montior for changes in the workspace folders.
		mentor.workspace.onDidChangeWorkspaceContents((e) => {
			this._onDidChangeTreeData.fire(e.uri.toString());
		});
	}

	refresh(): void {
		this._onDidChangeTreeData.fire(undefined);
	}

	getParent(uri: string): string | undefined {
		let resourceUri = vscode.Uri.parse(uri);

		return uri ? Utils.dirname(resourceUri).toString() : undefined;
	}

	/**
	 * Get the children of a folder.
	 * @param uri The URI of the folder to get children for or `undefined` for the root.
	 * @returns An array of child URIs, sorted by folders first and then by name.
	 */
	async getChildren(uri?: string): Promise<string[]> {
		if (!vscode.workspace.name || !vscode.workspace.workspaceFolders?.length) {
			return [];
		}

		if (!uri) {
			await mentor.workspace.waitForInitialized();
		}

		const result = [];

		if (uri) {
			// If the URI is provided, get the contents of the specified folder.
			const folder = vscode.Uri.parse(uri);

			result.push(...(await mentor.workspace.getFolderContents(folder)));
		} else if (!vscode.workspace.workspaceFile) {
			// If this is not a workspace, then return the contents of the first folder.
			const folder = vscode.workspace.workspaceFolders[0].uri;

			result.push(...(await mentor.workspace.getFolderContents(folder)));
		} else {
			// Iterate the workspace folders and push only the ones that have contents.
			for (const folder of vscode.workspace.workspaceFolders) {
				const contents = await mentor.workspace.getFolderContents(folder.uri);

				if (contents.length > 0) {
					result.push(folder.uri);
				}
			}
		}

		return result.map((resource) => resource.toString());
	}

	getTreeItem(uri: string): vscode.TreeItem {
		const resourceUri = vscode.Uri.parse(uri);
		const isDirectory = Utils.extname(resourceUri) == '';

		const item = new vscode.TreeItem(uri);
		item.resourceUri = resourceUri;
		item.label = Utils.basename(resourceUri);
		item.collapsibleState = isDirectory ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None;

		if (!isDirectory) {
			item.command = {
				command: 'vscode.open',
				arguments: [uri],
				title: 'Open File'
			};
		}

		return item;
	}

	getTotalItemCount(): number {
		return 0;
	}
}