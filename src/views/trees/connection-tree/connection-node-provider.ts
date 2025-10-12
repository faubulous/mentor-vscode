import * as vscode from 'vscode';
import { mentor } from '@src/mentor';
import { DocumentContext } from '@src/workspace/document-context';
import { ConnectionNode } from './nodes/connection-node';
import { ConnectionScopeNode } from './nodes/connection-scope-node';
import { TreeNode } from '../tree-node';

/**
 * A combined tree node provider for RDF classes, properties and individuals.
 */
export class ConnectionNodeProvider implements vscode.TreeDataProvider<TreeNode> {

	/**
	 * The vocabulary document context.
	 */
	public document: DocumentContext | undefined;

	private _onDidChangeTreeData = new vscode.EventEmitter<TreeNode | undefined>();

	readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

	constructor() {
		mentor.sparqlConnectionService.onDidChangeConnections(() => this.refresh());
	}

	/**
	 * Refresh the tree view.
	 */
	refresh(): void {
		this._onDidChangeTreeData.fire(undefined);
	}

	getParent(node: TreeNode): TreeNode | null | undefined {
		throw new Error('Method not implemented.');
	}

	async getTreeItem(node: TreeNode): Promise<vscode.TreeItem> {
		const children = await this.getChildren(node);
		const collapsibleState = children?.length ? node.initialCollapsibleState : vscode.TreeItemCollapsibleState.None;

		return {
			id: node.id,
			collapsibleState: collapsibleState,
			contextValue: node.getContextValue(),
			iconPath: node.getIcon(),
			label: node.getLabel(),
			description: node.getDescription(),
			command: node.getCommand(),
			tooltip: node.getTooltip()
		};
	}

	async getChildren(node?: TreeNode): Promise<TreeNode[] | null | undefined> {
		if (node) {
			let target: vscode.ConfigurationTarget;

			switch (node.id) {
				case vscode.ConfigurationTarget.Global.toString():
					target = vscode.ConfigurationTarget.Global;
					break;
				case vscode.ConfigurationTarget.Workspace.toString():
					target = vscode.ConfigurationTarget.Workspace;
					break;
				default:
					return null;
			}

			const connections = await mentor.sparqlConnectionService
				.getConnectionsForConfigTarget(target);

			return connections.map(connection => new ConnectionNode(connection));
		} else {
			return mentor.sparqlConnectionService
				.getSupportedConfigTargets()
				.map(target => new ConnectionScopeNode(target));
		}
	}
}