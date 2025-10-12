import * as vscode from 'vscode';
import { TreeView } from '@src/views/trees/tree-view';
import { TreeNode } from '@src/views/trees/tree-node';
import { ConnectionNodeProvider } from './connection-node-provider';

/**
 * Provides an explorer view for managing SPARQL endpoint connections.
 */
export class ConnectionTree implements TreeView {
	/**
	 * The ID which is used to register the view and make it visible in VS Code.
	 */
	readonly id = "mentor.view.connectionTree";

	/**
	 * The tree node provider.
	 */
	readonly treeDataProvider = new ConnectionNodeProvider();

	/**
	 * The tree view.
	 */
	readonly treeView: vscode.TreeView<TreeNode>;

	constructor() {
		this.treeView = vscode.window.createTreeView<TreeNode>(this.id, {
			treeDataProvider: this.treeDataProvider,
			showCollapseAll: true
		});

		vscode.commands.registerCommand('mentor.command.refreshConnectionsTree', async () => {
			this.treeDataProvider.refresh();
		});
	}
}