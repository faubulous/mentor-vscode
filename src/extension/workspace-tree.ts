import * as vscode from 'vscode';
import { TreeView } from './tree-view';
import { WorkspaceNodeProvider } from './workspace-node-provider';

export class WorkspaceTree implements TreeView {
	/**
	 * The ID which is used to register the view and make it visible in VS Code.
	 */
	readonly id = "mentor.view.workspaceTree";

	/**
	 * The tree node provider.
	 */
	readonly treeDataProvider = new WorkspaceNodeProvider();

	/**
	 * The tree view.
	 */
	readonly treeView: vscode.TreeView<vscode.Uri>;

	constructor(protected context: vscode.ExtensionContext) {
		vscode.window.registerTreeDataProvider(this.id, this.treeDataProvider);

		this.treeView = vscode.window.createTreeView(this.id, {
			treeDataProvider: this.treeDataProvider,
			showCollapseAll: true
		});

		this.treeView.title = vscode.workspace.name ?? "Workspace";

		vscode.commands.executeCommand('setContext', 'viewType', 'treeView');
	}
}