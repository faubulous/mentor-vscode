import * as vscode from 'vscode';

/**
 * Base class for a node in the definition tree.
 */
export interface TreeNode {
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
	 * The default collapsible state of the tree item.
	 */
	initialCollapsibleState: vscode.TreeItemCollapsibleState;

	/**
	 * Get the command that is executed when the tree item is clicked.
	 * @returns A command that is executed when the tree item is clicked.
	 */
	getCommand(): vscode.Command | undefined;

	/**
	 * Get the children of the tree item.
	 */
	getChildren(): TreeNode[];

	/**
	 * Get a value that can be accessed in `package.json` for the context menu.
	 * @returns A string that represents the context value of the tree item.
	 */
	getContextValue(): string;

	/**
	 * Get the label of the tree item.
	 * @returns The label of the tree item.
	 */
	getLabel(): vscode.TreeItemLabel ;

	/**
	 * Get the description of the tree item.
	 * @returns A description string or `undefined` if no description should be shown.
	 */
	getDescription(): string ;

	/**
	 * Get the tooltip of the tree item.
	 * @returns A markdown string or `undefined` if no tooltip should be shown.
	 */
	getTooltip(): vscode.MarkdownString | undefined ;

	/**
	 * Get the icon of the tree item.
	 * @returns A theme icon, a file system path or undefined if no icon should be shown.
	 */
	getIcon(): vscode.ThemeIcon | undefined;

	/**
	 * Get the theme color for the icon of the tree item.
	 * @returns A theme color or undefined for the default icon color.
	 */
	getIconColor(): vscode.ThemeColor | undefined;
}

/**
 * Abstract base class for a node in tree views.
 */
export abstract class TreeNodeBase implements TreeNode {

	id: string = '';

	uri: string = '';

	label: string = '';

	initialCollapsibleState = vscode.TreeItemCollapsibleState.None;

	getCommand(): vscode.Command | undefined {
		return undefined;
	}

	abstract getContextValue(): string;

	getChildren(): TreeNode[] {
		return [];
	}

	getDescription(): string {
		return '';
	}

	abstract getLabel(): vscode.TreeItemLabel ;

	getTooltip(): vscode.MarkdownString | undefined {
		return undefined;
	}

	getIcon(): vscode.ThemeIcon | undefined {
		return undefined;
	}

	getIconColor(): vscode.ThemeColor | undefined {
		return new vscode.ThemeColor('descriptionForeground');
	}
}

/**
 * Sort nodes by their labels according to the current label display settings.
 * @param nodes A list of definition tree nodes.
 * @returns The nodes sorted by their labels.
 */
export function sortByLabel(nodes: TreeNode[]): TreeNode[] {
	return nodes
		.map(n => ({ node: n, label: n.getLabel().label }))
		.sort((a, b) => a.label.localeCompare(b.label))
		.map(x => x.node);
}