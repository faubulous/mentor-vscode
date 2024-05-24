import * as vscode from "vscode";
import { DefinitionQueryOptions } from "@faubulous/mentor-rdf";
import { DocumentContext } from "../languages";

export interface DefinitionTreeNode {
	/**
	 * The unique identifier of the tree item.
	 */
	id: string;

	/**
	 * The URI of the tree item or undefined if the tree item is not associated with a URI.
	 */
	uri: string | undefined;

	/**
	 * The document context of the tree item.
	 */
	document: DocumentContext;

	/**
	 * The RDF type of the definition context.
	 */
	contextType?: string;

	/**
	 * A value that can be accessed in package.json for the context menu.
	 */
	contextValue: string;

	/**
	 * The default collapsible state of the tree item.
	 */
	initialCollapsibleState: vscode.TreeItemCollapsibleState;

	/**
	 * The options for querying the children of the tree item.
	 */
	options?: DefinitionQueryOptions;

	/**
	 * Get the label of the tree item.
	 * @returns The label of the tree item.
	 */
	getLabel(): vscode.TreeItemLabel;

	/**
	 * Get the description of the tree item.
	 * @returns A description string or undefined if no description should be shown.
	 */
	getDescription(): string | undefined;

	/**
	 * Get the icon of the tree item.
	 * @returns A theme icon or undefined if no icon should be shown.
	 */
	getIcon(): vscode.ThemeIcon | undefined;

	/**
	 * Get the theme color for the icon of the tree item.
	 * @returns A theme color or undefined for the default icon color.
	 */
	getIconColor(): vscode.ThemeColor | undefined;

	/**
	 * Get the command for the tree item.
	 * @returns A command or undefined if no command should be shown.
	 */
	getCommand(): vscode.Command | undefined;

	/**
	 * Get the tooltip of the tree item.
	 * @returns A markdown string or undefined if no tooltip should be shown.
	 */
	getTooltip(): vscode.MarkdownString | undefined;
}