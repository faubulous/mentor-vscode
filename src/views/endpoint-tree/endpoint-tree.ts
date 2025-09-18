import * as vscode from 'vscode';
import { mentor } from '@/mentor'
import { TreeView } from '@/views/tree-view';
import { EndpointTreeNode } from './endpoint-tree-node';
import { EndpointNodeProvider } from './endpoint-node-provider';

/**
 * Provides an explorer view for managing SPARQL endpoint connections.
 */
export class EndpointTree implements TreeView {
	/**
	 * The ID which is used to register the view and make it visible in VS Code.
	 */
	readonly id = "mentor.view.endpointTree";

	/**
	 * The tree node provider.
	 */
	readonly treeDataProvider = new EndpointNodeProvider();

	/**
	 * The tree view.
	 */
	readonly treeView: vscode.TreeView<EndpointTreeNode>;

	constructor() {
		this.treeView = vscode.window.createTreeView<EndpointTreeNode>(this.id, {
			treeDataProvider: this.treeDataProvider,
			showCollapseAll: true
		});

		vscode.commands.registerCommand('mentor.command.refreshEndpointTree', async () => {
			this.treeDataProvider.refresh();
		});
	}
}