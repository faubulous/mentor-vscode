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
		mentor.workspace.onDidChangeWorkspaceFolder((e) => {
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

	async getChildren(uri: string): Promise<string[]> {
		if (!vscode.workspace.name || !vscode.workspace.workspaceFolders?.length) {
			return [];
		}

		let resourceUri;

		if (uri == null) {
			await mentor.workspace.waitForInitialized();

			resourceUri = vscode.workspace.workspaceFolders[0].uri;
		} else {
			resourceUri = vscode.Uri.parse(uri);
		}

		const result = await mentor.workspace.getFolderContents(resourceUri);

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