import * as vscode from 'vscode';
import { ResourceNodeProvider } from './resource-node-provider';

export class TermNode extends vscode.TreeItem {
	contextValue = 'provider';

	constructor(protected readonly provider: ResourceNodeProvider) {
		super(provider.getTitle(), vscode.TreeItemCollapsibleState.Collapsed);

		const n = provider.getTotalItemCount();

		this.id = provider.id;
		this.description = n.toString();
		this.contextValue = 'provider.' + provider.id;

		if (n == 0) {
			this.collapsibleState = vscode.TreeItemCollapsibleState.None;
		} else if (provider.id == 'ontology') {
			this.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
		}
	}
}