import * as vscode from 'vscode';
import { mentor } from '@/mentor';
import { DocumentContext } from '@/workspace/document-context';
import { EndpointTreeNode } from './endpoint-tree-node';
/**
 * A combined tree node provider for RDF classes, properties and individuals.
 */
export class EndpointNodeProvider implements vscode.TreeDataProvider<EndpointTreeNode> {
	/**
	 * The vocabulary document context.
	 */
	public document: DocumentContext | undefined;

	private _onDidChangeTreeData: vscode.EventEmitter<EndpointTreeNode | undefined> = new vscode.EventEmitter<EndpointTreeNode | undefined>();

	readonly onDidChangeTreeData: vscode.Event<EndpointTreeNode | undefined> = this._onDidChangeTreeData.event;

	constructor() {
		mentor.sparqlEndpointService.onDidChangeConnections(() => this.refresh());
	}

	/**
	 * Refresh the tree view.
	 */
	refresh(): void {
		this._onDidChangeTreeData.fire(undefined);
	}

	getParent(node: EndpointTreeNode): EndpointTreeNode | null | undefined {
		throw new Error('Method not implemented.');
	}

	async getChildren(node: EndpointTreeNode): Promise<EndpointTreeNode[] | null | undefined> {
		const connections = await mentor.sparqlEndpointService.getConnections();

		return connections.map(connection => new EndpointTreeNode(connection));
	}

	async getTreeItem(node: EndpointTreeNode): Promise<vscode.TreeItem> {
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
}