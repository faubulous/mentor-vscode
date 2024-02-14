import * as vscode from 'vscode';
import { ResourceNodeProvider } from './resource-node-provider';

/**
 * A combined tree node provider for RDF classes, properties and individuals.
 */
export class TermNodeProvider extends ResourceNodeProvider {
	private _selectedProvider: ResourceNodeProvider;

	constructor(provider: ResourceNodeProvider) {
		super();

		this._selectedProvider = provider;
	}

	setProvider(provider: ResourceNodeProvider) {
		this._selectedProvider = provider;

		this.refresh();
	}

	override getParent(uri: string): string | undefined {
		return this._selectedProvider.getParent(uri);
	}

	override getChildren(uri: string): string[] {
		return this._selectedProvider.getChildren(uri);
	}

	override getTreeItem(uri: string): vscode.TreeItem {
		return this._selectedProvider.getTreeItem(uri);
	}

	override getTotalItemCount(): number {
		return this._selectedProvider.getTotalItemCount();
	}
}