import * as vscode from 'vscode';
import { DefinitionQueryOptions } from '@faubulous/mentor-rdf';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { ISettingsService } from '@src/services/core';
import { IDocumentContext } from '@src/services/document/document-context.interface';
import { TreeNodeBase } from '@src/views/trees/tree-node';
import { getIriFromNodeId } from '@src/utilities';

/**
 * Base class for a node in the definition tree.
 */
export class DefinitionTreeNode extends TreeNodeBase {

	protected get settings() {
		return container.resolve<ISettingsService>(ServiceToken.SettingsService);
	}

	initialCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed;

	/**
	 * The parent node in the tree, or undefined if this is a root node.
	 */
	parent: DefinitionTreeNode | undefined;

	/**
	 * The documet context used to query definitions.
	 */
	document: IDocumentContext;

	/**
	 * The options for querying the children of the tree item.
	 */
	private _queryOptions?: DefinitionQueryOptions;

	constructor(context: IDocumentContext, id: string, uri: string, options?: DefinitionQueryOptions) {
		super();

		this.id = id;
		this.uri = uri;
		this.document = context;
		this._queryOptions = options;
	}

	/**
	 * Create a child node of the definition tree node.
	 * @param NodeConstructor Constructor of the child node.
	 * @param iri IRI of the child node.
	 * @param options Optional query options for querying the children of the created node.
	 * @returns A new instance of the child node.
	 */
	createChildNode<NodeType extends DefinitionTreeNode>(
		NodeConstructor: new (document: IDocumentContext, id: string, iri: string, options?: any) => NodeType,
		iri: string,
		options?: any
	): NodeType {
		// TODO: Move ID creation to a separate method in uri module.
		const id = `${this.id}/<${iri}>`;

		const node = new NodeConstructor(this.document, id, iri, this.getQueryOptions(options));
		node.parent = this;

		return node;
	}

	getCommand(): vscode.Command | undefined {
		return {
			command: 'mentor.command.revealDefinition',
			title: '',
			arguments: [this.id, true]
		};
	}

	getContextValue(): string {
		return 'resource';
	}

	getDocumentGraphs(): string[] {
		return this.document.graphs;
	}

	getLabel(): vscode.TreeItemLabel {
		const label = this.document.getResourceLabel(this.uri).value;

		return { label }
	}

	getDescription(): string {
		const label = this.document.getResourceLabel(this.uri);
		const activeLanguageTag = this.document.activeLanguageTag;
		const activeLanguage = this.document.activeLanguage;

		if (!label.language || !activeLanguageTag || !activeLanguage) {
			return "";
		}

		// We return the language tag as a description if it differs from the active language,
		// or if the selected language tag is non-regional but the returned label is.
		if (!label.language.startsWith(activeLanguage) || label.language.length > activeLanguageTag.length) {
			return "@" + label.language;
		} else {
			return "";
		}
	}

	getTooltip(): vscode.MarkdownString | undefined {
		if (this.uri) {
			return this.document.getResourceTooltip(this.uri);
		} else {
			return undefined;
		}
	}

	/**
	 * Get the resolved resourceUri of the tree item. This is either the `resourceUri` or the `uri` of the tree item.
	 * @returns The URI of the tree item or undefined if the tree item is not associated with a URI.
	 */
	getResourceUri(): vscode.Uri | undefined {
		return vscode.Uri.parse(this.uri);
	}

	/**
	 * Resolve a descendant node matching the given IRI. Override in container nodes
	 * to provide efficient, type-aware resolution instead of brute-force traversal.
	 * @param iri The resource IRI to search for.
	 * @returns The matching tree node, or `undefined` if this subtree cannot resolve it.
	 */
	resolveNodeForUri(iri: string): DefinitionTreeNode | undefined {
		return undefined;
	}

	/**
	 * Walk a hierarchy path of IRIs through the children of this node, expanding
	 * each level lazily. Returns the node matching the last IRI in the path.
	 * @param path An array of IRIs ordered from root ancestor to target.
	 * @returns The node at the end of the path, or `undefined` if any step fails.
	 */
	walkHierarchyPath(path: string[]): DefinitionTreeNode | undefined {
		let children = this.getChildren() as DefinitionTreeNode[];
		let found: DefinitionTreeNode | undefined;

		for (const pathIri of path) {
			found = children.find(n => n.uri === pathIri);

			if (!found) {
				return undefined;
			}

			children = found.getChildren() as DefinitionTreeNode[];
		}

		return found;
	}

	/**
	 * Get the query options for the tree item.
	 * @param additionalOptions Query options that will override or be added to the associated query options.
	 * @returns A query options object.
	 */
	getQueryOptions(additionalOptions?: any): DefinitionQueryOptions {
		return {
			...this._queryOptions,
			includeReferenced: this.settings.get('view.showReferences', true),
			...additionalOptions,
		}
	}
}

export function getIriFromArgument(arg: DefinitionTreeNode | string): string {
	if (arg instanceof DefinitionTreeNode) {
		return getIriFromNodeId(arg.id);
	} else if (typeof arg === 'string') {
		return getIriFromNodeId(arg);
	} else {
		throw new Error('Invalid argument type: ' + typeof arg);
	}
}