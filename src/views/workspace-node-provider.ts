import * as path from 'path';
import * as vscode from 'vscode';
import * as mentor from '../mentor';

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
			this._onDidChangeTreeData.fire(e.uri.path);
		});
	}

	refresh(): void {
		this._onDidChangeTreeData.fire(undefined);
	}

	getParent(id: string): string | undefined {
		return id ? path.dirname(id) : undefined;
	}

	async getChildren(id: string): Promise<string[]> {
		if (!vscode.workspace.name || !vscode.workspace.workspaceFolders?.length) {
			return [];
		}

		let uri;

		if (id == null) {
			await mentor.workspace.waitForInitialized();

			uri = vscode.workspace.workspaceFolders[0].uri;
		} else {
			uri = vscode.Uri.file(id);
		}

		const result = await mentor.workspace.getFolderContents(uri);

		return result.map((item) => item.path);
	}

	getTreeItem(id: string): vscode.TreeItem {
		const isDirectory = path.extname(id) == '';

		const item = new vscode.TreeItem(id);
		item.resourceUri = vscode.Uri.file(id);
		item.label = path.basename(id);
		item.collapsibleState = isDirectory ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None;

		if (!isDirectory) {
			item.command = {
				command: 'vscode.open',
				arguments: [id],
				title: 'Open File'
			};
		}

		return item;
	}

	getTotalItemCount(): number {
		return 0;
	}
}