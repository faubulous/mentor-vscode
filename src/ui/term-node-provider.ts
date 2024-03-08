import * as vscode from 'vscode';
import { ResourceNodeProvider } from './resource-node-provider';
import { TermNode } from './term-node';
import { getProviderFromNodeId, hasUri } from '../utilities';

/**
 * A combined tree node provider for RDF classes, properties and individuals.
 */
export class TermNodeProvider extends ResourceNodeProvider {
	id = 'term';

	/*
	 * A map of providers that are registered for the different types of nodes.
	 */
	private _providers: { [id: string]: ResourceNodeProvider } = {};

	/*
	 * Registers a provider for a specific type of node.
	 */
	public registerProvider(provider: ResourceNodeProvider): void {
		this._providers[provider.id] = provider;
	}

	/*
	 * Selects the provider for the given node id.
	 */
	protected getProvider(id: string): ResourceNodeProvider {
		let key = getProviderFromNodeId(id);
		let provider = this._providers[key];

		if (!provider) {
			throw new Error(`No provider found for id '${key}'.`);
		}

		return provider;
	}

	/**
	 * Indicates whether the tree has registered term definition providers.
	 * @returns true if at least one provider is registered.
	 */
	public hasProviders(): boolean {
		return Object.keys(this._providers).length > 0;
	}

	/**
	 * Idicates whether the tree has items.
	 * @returns true if at least one provider has items.
	 */
	private hasItems() {
		for (let p of Object.values(this._providers)) {
			if (p.getTotalItemCount() > 0) {
				return true;
			}
		}

		return false;
	}

	override getTitle(): string {
		return "Terms";
	}

	override getParent(nodeId: string): string | undefined {
		// If we get a provider id, we return undefined, because the provider is the root node.
		if (hasUri(nodeId)) {
			return this.getProvider(nodeId).getParent(nodeId);
		} else {
			return undefined;
		}
	}

	override getChildren(id: string): string[] {
		if (id) {
			const provider = this.getProvider(id);

			// The URI may be undefined. The provider will return the root nodes in this case.
			const result = provider.getChildren(hasUri(id) ? id : undefined);

			return result;
		} else if (this.hasItems()) {
			return Object.keys(this._providers);
		} else {
			return [];
		}
	}

	override getTreeItem(id: string): vscode.TreeItem {
		const provider = this.getProvider(id);

		if (!provider) {
			throw new Error(`No provider found for id '${id}'.`);
		}

		// If the only colon is at the end of the string, we return a tree item for the provider.
		return hasUri(id) ? provider.getTreeItem(id) : new TermNode(provider);
	}

	override getTotalItemCount(): number {
		return Object.values(this._providers).length;
	}
}