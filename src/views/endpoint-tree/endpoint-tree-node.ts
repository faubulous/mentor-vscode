import * as vscode from 'vscode';
import { getConfigurationTargetLabel, SparqlConnection } from '@/services/sparql-connection';

/**
 * Base class for a node in the SPARQL connection tree.
 */
export class EndpointTreeNode {
	/**
	 * The unique identifier of the tree item.
	 * @remark It must be unique across all tree items and thus using the resource IRI 
	 * is not suitable. In moste cases we encode the path of the tree item from the 
	 * root node using this notation: `<parent-iri>/<child-iri>`.
	 */
	id: string;

	/**
	 * The label of the tree item.
	 */
	label: string;

	/**
	 * The default collapsible state of the tree item.
	 */
	initialCollapsibleState = vscode.TreeItemCollapsibleState.Expanded;

	/**
	 * The SPARQL connection represented by this tree item.
	 */
	endpoint: SparqlConnection | undefined;

	constructor(context: SparqlConnection | vscode.ConfigurationTarget) {
		if (typeof context === 'number') {
			this.id = context.toString();
			this.label = getConfigurationTargetLabel(context);
		} else {
			this.id = context.id;
			this.label = context.endpointUrl;
			this.endpoint = context;
		}
	}

	/**
	 * Create a child node of the definition tree node.
	 * @param NodeConstructor Constructor of the child node.
	 * @param iri IRI of the child node.
	 * @param options Optional query options for querying the children of the created node.
	 * @returns A new instance of the child node.
	 */
	createChildNode<NodeType extends EndpointTreeNode>(
		NodeConstructor: new (id: string) => NodeType,
		iri: string,
		options?: any
	): NodeType {
		throw new Error('Method not implemented.');
	}

	/**
	 * Get the command that is executed when the tree item is clicked.
	 * @returns A command that is executed when the tree item is clicked.
	 */
	getCommand(): vscode.Command | undefined {
		if (this.endpoint) {
			return {
				title: '',
				command: 'mentor.command.editSparqlConnection',
				arguments: [this.endpoint, true]
			};
		}
	}

	/**
	 * Get the children of the tree item.
	 */
	getChildren(): EndpointTreeNode[] {
		return [];
	}

	/**
	 * Get a value that can be accessed in `package.json` for the context menu.
	 * @returns A string that represents the context value of the tree item.
	 */
	getContextValue(): string {
		return 'endpoint';
	}

	/**
	 * Get the label of the tree item.
	 * @returns The label of the tree item.
	 */
	getLabel(): vscode.TreeItemLabel {
		return { label: this.label };
	}

	/**
	 * Get the description of the tree item.
	 * @returns A description string or `undefined` if no description should be shown.
	 */
	getDescription(): string {
		if (this.endpoint?.isModified) {
			return 'Unsaved';
		} else {
			return '';
		}
	}

	/**
	 * Get the tooltip of the tree item.
	 * @returns A markdown string or `undefined` if no tooltip should be shown.
	 */
	getTooltip(): vscode.MarkdownString | undefined {
		return undefined;
	}

	/**
	 * Get the icon of the tree item.
	 * @returns A theme icon, a file system path or undefined if no icon should be shown.
	 */
	getIcon(): vscode.ThemeIcon | undefined {
		if (this.endpoint) {
			return new vscode.ThemeIcon('database', this.getIconColor());
		} else {
			return undefined;
		}
	}

	/**
	 * Get the theme color for the icon of the tree item.
	 * @returns A theme color or undefined for the default icon color.
	 */
	getIconColor(): vscode.ThemeColor | undefined {
		return new vscode.ThemeColor('descriptionForeground');
	}
}