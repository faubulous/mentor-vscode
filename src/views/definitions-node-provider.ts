import * as vscode from 'vscode';
import * as mentor from '../mentor';
import { ResourceNodeProvider } from './resource-node-provider';
import { getProviderFromNodeId } from '../utilities';
import { DocumentContext } from '../document-context';

export interface TermTreeNode {
	/**
	 * The URI of the resource.
	 */
	uri: string | undefined;

	provider: ResourceNodeProvider;
}

/**
 * A combined tree node provider for RDF classes, properties and individuals.
 */
export class TermNodeProvider implements vscode.TreeDataProvider<TermTreeNode> {
	id = 'term';

	/**
	 * The vocabulary document context.
	 */
	public context: DocumentContext | undefined;

	/*
	 * A map of providers that are registered for the different types of nodes.
	 */
	private _providers: { [id: string]: ResourceNodeProvider } = {};

	private _onDidChangeTreeData: vscode.EventEmitter<TermTreeNode | undefined> = new vscode.EventEmitter<TermTreeNode | undefined>();

	readonly onDidChangeTreeData: vscode.Event<TermTreeNode | undefined> = this._onDidChangeTreeData.event;

	constructor() {
		if (mentor.activeContext) {
			this._onVocabularyChanged(mentor.activeContext);
		}

		mentor.onDidChangeVocabularyContext((context) => {
			this._onVocabularyChanged(context);
		});

		mentor.settings.onDidChange("view.treeLabelStyle", () => {
			this.refresh();
		});
	}

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

	private _onVocabularyChanged(e: DocumentContext | undefined): void {
		if (e) {
			this.context = e;
			this.onDidChangeVocabularyContext(e);
			this._onDidChangeTreeData.fire(void 0);
		}
	}

	/**
	 * A callback that is called when the vocabulary document context has changed.
	 * @param context The new vocabulary document context.
	 */
	protected onDidChangeVocabularyContext(context: DocumentContext) { }

	/**
	 * Refresh the tree view.
	 */
	refresh(): void {
		this._onVocabularyChanged(this.context);
	}

	getParent(node: TermTreeNode): TermTreeNode | undefined {
		// If we get a provider id, we return undefined, because the provider is the root node.
		if (node && node.uri) {
			return {
				uri: node.provider.getParent(node.uri),
				provider: node.provider
			};
		} else {
			return undefined;
		}
	}

	getChildren(node: TermTreeNode): TermTreeNode[] {
		if (node) {
			// The URI may be undefined. The provider will return the root nodes in this case.
			const result = node.provider.getChildren(node.uri).map(uri => ({
				uri: uri,
				provider: node.provider
			}));

			return result;
		} else if (this.context) {
			const result: TermTreeNode[] = [];

			for (let o of mentor.vocabulary.getOntologies(this.context?.graphs)) {
				result.push({
					uri: o,
					provider: this.getProvider('ontology'),
				});
			}

			// for (let s of mentor.vocabulary.getConceptSchemes(this.context?.graphs)) {
			// 	result.push(s);
			// }

			const options = { definedBy: null, includeReferenced: false };

			for (let c of mentor.vocabulary.getClasses(this.context?.graphs, options)) {
				result.push({
					uri: undefined,
					provider: this.getProvider('class')
				});
				break;
			}

			for (let p of mentor.vocabulary.getProperties(this.context?.graphs, options)) {
				result.push({
					uri: undefined,
					provider: this.getProvider('property')
				});
				break;
			}

			// for(let i of mentor.vocabulary.getIndividuals(this.context?.graphs, { definedBy: null})) {
			// 	result.push({
			// 		uri: undefined,
			// 		provider: this.getProvider('individual'),
			// 	});
			// 	break;
			// }

			return result;
		} else {
			return [];
		}
	}

	getTreeItem(node: TermTreeNode): vscode.TreeItem {
		if (node.uri) {
			return node.provider.getTreeItem(node.uri);
		} else {
			const item = new vscode.TreeItem('No items found', vscode.TreeItemCollapsibleState.None);
			item.contextValue = 'noItems';
			return item;

		}
	}
}