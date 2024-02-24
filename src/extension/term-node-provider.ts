import * as vscode from 'vscode';
import { ResourceNodeProvider } from './resource-node-provider';
import { TermNode } from './term-node';

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
		let key = id.substring(0, id.indexOf(':'));
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
		if (nodeId && !nodeId.endsWith(':')) {
			const provider = this.getProvider(nodeId);

			return provider.id + ":" + provider.getParent(nodeId) ?? '';
		} else {
			return undefined;
		}
	}

	override getChildren(id: string): string[] {
		if (id) {
			const provider = this.getProvider(id);

			// The URI may be undefined. The provider will return the root nodes in this case.
			const uri = id.endsWith(':') ? undefined : id.substring(id.indexOf(':') + 1);

			// The resource providers will return URIs, so we need to prefix them with the provider id.
			const result = provider.getChildren(uri).map(u => provider.id + ':' + u);

			return result;
		} else if (this.hasItems()) {
			return Object.keys(this._providers).map(id => id + ':');
		} else {
			return [];
		}
	}

	override getTreeItem(id: string): vscode.TreeItem {
		const n = id.indexOf(':');

		if (n < 0) {
			throw new Error(`Invalid tree item id: '${id}'`);
		}

		const provider = this.getProvider(id);

		// If the only colon is at the end of the string, we return a tree item for the provider.
		if (n == id.length - 1) {
			return new TermNode(provider);
		} else {
			return provider.getTreeItem(id.substring(n + 1));
		}
	}

	override getTotalItemCount(): number {
		return Object.values(this._providers).length;
	}
}