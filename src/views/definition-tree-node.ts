import * as vscode from 'vscode';
import { DocumentContext } from "../languages";
import { DefinitionQueryOptions } from "@faubulous/mentor-rdf";
import { mentor } from '../mentor';

/**
 * Base class for a node in the definition tree.
 */
export class DefinitionTreeNode {
	/**
	 * The unique identifier of the tree item.
	 * @remark It must be unique across all tree items and thus using the resource IRI 
	 * is not suitable. In moste cases we encode the path of the tree item from the 
	 * root node using this notation: `<parent-iri>/<child-iri>`.
	 */
	id: string;

	/**
	 * The URI of the tree item or undefined if the tree item is not associated with a URI.
	 */
	uri: string;

	/**
	 * The document context of the tree item.
	 */
	document: DocumentContext;

	/**
	 * A value that can be accessed in package.json for the context menu.
	 * @deprecated Use `getContextValue` instead.
	 */
	contextValue: string = 'resource';

	/**
	 * The options for querying the children of the tree item.
	 */
	private _queryOptions?: DefinitionQueryOptions;

	/**
	 * The default collapsible state of the tree item.
	 */
	initialCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed;

	// TODO: Cache children.
	// TODO: Refactor constructor to also take an optional parent node.
	constructor(context: DocumentContext, id: string, uri: string, options?: DefinitionQueryOptions) {
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
		NodeConstructor: new (document: DocumentContext, id: string, iri: string, options?: any) => NodeType,
		iri: string,
		options?: any
	): NodeType {
		// TODO: Move ID creation to a separate method in uri module.
		const id = `${this.id}/<${iri}>`;

		return new NodeConstructor(this.document, id, iri, this.getQueryOptions(options));
	}

	/**
	 * Get the command that is executed when the tree item is clicked.
	 * @returns A command that is executed when the tree item is clicked.
	 */
	getCommand(): vscode.Command | undefined {
		return {
			command: 'mentor.action.revealDefinition',
			title: '',
			arguments: [this.id, true]
		};
	}

	/**
	 * Get the children of the tree item.
	 */
	getChildren(): DefinitionTreeNode[] {
		return [];
	}

	/**
	 * Get a value that can be accessed in `package.json` for the context menu.
	 * @returns A string that represents the context value of the tree item.
	 */
	getContextValue(): string {
		return 'resource';
	}

	/**
	 * Get the graph IRIs of the document context, including the document a-box and it's inference graph.
	 * @returns An array of graph IRIs.
	 */
	getDocumentGraphs(): string[] {
		return this.document.graphs;
	}

	/**
	 * Get the label of the tree item.
	 * @returns The label of the tree item.
	 */
	getLabel(): vscode.TreeItemLabel {
		const label = this.document.getResourceLabel(this.uri).value;

		return { label }
	}

	/**
	 * Get the description of the tree item.
	 * @returns A description string or `undefined` if no description should be shown.
	 */
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

	/**
	 * Get the tooltip of the tree item.
	 * @returns A markdown string or `undefined` if no tooltip should be shown.
	 */
	getTooltip(): vscode.MarkdownString | undefined {
		if (this.uri) {
			return this.document.getResourceTooltip(this.uri);
		} else {
			return undefined;
		}
	}

	/**
	 * Get the icon of the tree item.
	 * @returns A theme icon, a file system path or undefined if no icon should be shown.
	 */
	getIcon(): vscode.ThemeIcon | undefined {
		return undefined;
	}

	/**
	 * Get the theme color for the icon of the tree item.
	 * @returns A theme color or undefined for the default icon color.
	 */
	getIconColor(): vscode.ThemeColor | undefined {
		return new vscode.ThemeColor('descriptionForeground');
	}

	/**
	 * Get the resolved resourceUri of the tree item. This is either the `resourceUri` or the `uri` of the tree item.
	 * @returns The URI of the tree item or undefined if the tree item is not associated with a URI.
	 */
	getResourceUri(): vscode.Uri | undefined {
		return vscode.Uri.parse(this.uri);
	}

	/**
	 * Get the query options for the tree item.
	 * @param additionalOptions Query options that will override or be added to the associated query options.
	 * @returns A query options object.
	 */
	getQueryOptions(additionalOptions?: any): DefinitionQueryOptions {
		return {
			...this._queryOptions,
			includeReferenced: mentor.settings.get('view.showReferences', true),
			...additionalOptions,
		}
	}
}

/**
 * Sort nodes by their labels according to the current label display settings.
 * @param nodes A list of definition tree nodes.
 * @returns The nodes sorted by their labels.
 */
export function sortByLabel(nodes: DefinitionTreeNode[]): DefinitionTreeNode[] {
	return nodes
		.map(n => ({ node: n, label: n.getLabel().label }))
		.sort((a, b) => a.label.localeCompare(b.label))
		.map(x => x.node);
}