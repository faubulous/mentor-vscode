import * as vscode from 'vscode';
import { DocumentContext } from "../languages";
import { DefinitionQueryOptions } from "@faubulous/mentor-rdf";

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
	uri: string | undefined;

	// TODO: What is the difference between uri and resourceUri?
	/**
	 * The URI of the resource associated with the tree item.
	 */
	resourceUri?: vscode.Uri;

	/**
	 * The document context of the tree item.
	 */
	document: DocumentContext;

	/**
	 * A value that can be accessed in package.json for the context menu.
	 */
	contextValue: string = 'resource';

	/**
	 * The options for querying the children of the tree item.
	 */
	options?: DefinitionQueryOptions;

	/**
	 * The default collapsible state of the tree item.
	 */
	initialCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed;

	constructor(context: DocumentContext, id: string, uri: string | undefined, options?: DefinitionQueryOptions) {
		this.id = id;
		this.uri = uri;
		this.document = context;
		this.options = options;
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
	 * Get the label of the tree item.
	 * @returns The label of the tree item.
	 */
	getLabel(): vscode.TreeItemLabel {
		let label: string;

		if (this.uri) {
			label = this.document.getResourceLabel(this.uri).value;
		} else {
			label = this.id;
		}

		return { label }
	}

	/**
	 * Get the description of the tree item.
	 * @returns A description string or `undefined` if no description should be shown.
	 */
	getDescription(): string {
		if (!this.uri) {
			return "";
		}

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
	getIcon(): vscode.ThemeIcon | string | undefined {
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
		if (this.resourceUri) {
			return this.resourceUri;
		} else if (this.uri) {
			return vscode.Uri.parse(this.uri);
		} else {
			return undefined;
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