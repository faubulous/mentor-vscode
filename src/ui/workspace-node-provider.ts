import * as path from 'path';
import * as vscode from 'vscode';
import * as mentor from '../mentor';

/**
 * A tree node provider for RDF files in the Visual Studio Code workspace.
 */
export class WorkspaceNodeProvider implements vscode.TreeDataProvider<vscode.Uri> {
	private _onDidChangeTreeData: vscode.EventEmitter<vscode.Uri | undefined> = new vscode.EventEmitter<vscode.Uri | undefined>();

	readonly onDidChangeTreeData: vscode.Event<vscode.Uri | undefined> = this._onDidChangeTreeData.event;

	constructor() {
		mentor.workspace.onDidChangeWorkspaceFolder((e) => this._onDidChangeTreeData.fire(undefined));
	}

	getParent(id: vscode.Uri): vscode.Uri | undefined {
		return undefined;
	}

	async getChildren(id: vscode.Uri): Promise<vscode.Uri[]> {
		if (!vscode.workspace.name || !vscode.workspace.workspaceFolders?.length) {
			return [];
		}

		let result = [];

		if (id == null) {
			await mentor.workspace.waitForInitialization();

			result = mentor.workspace.rootItems;
		} else {
			result = await mentor.workspace.getFolderContents(id);
		}

		return result.map((item) => item.uri);
	}

	getTreeItem(id: vscode.Uri): vscode.TreeItem {
		const isDirectory = path.extname(id.path) == '';

		const item = new vscode.TreeItem(id);
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