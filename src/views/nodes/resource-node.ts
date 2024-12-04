import * as vscode from 'vscode';
import { DefinitionQueryOptions, RDFS } from "@faubulous/mentor-rdf";
import { DefinitionTreeNode } from "../definition-tree-node";
import { DocumentContext } from "../../languages";

export class ResourceNode implements DefinitionTreeNode {
	contextValue: string = 'resource';

	id: string;

	// TODO: Fix #10 in mentor-rdf; Make this a rdfjs.Quad_Subject instead of string.
	uri: string | undefined;

	/**
	 * The default label of the tree item if the `uri` property is undefined.
	 */
	defaultLabel: string | undefined;

	document: DocumentContext;

	contextType?: string;

	options?: DefinitionQueryOptions;

	initialCollapsibleState = vscode.TreeItemCollapsibleState.None;

	resourceUri?: vscode.Uri | undefined;

	constructor(context: DocumentContext, id: string, uri: string | undefined, options?: DefinitionQueryOptions) {
		this.id = id;
		this.uri = uri;
		this.document = context;
		this.contextType = RDFS.Resource;
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
	 * Get the label of the tree item.
	 * @returns The label of the tree item.
	 */
	getLabel(): vscode.TreeItemLabel {
		let label: string;

		if (this.uri) {
			label = this.document.getResourceLabel(this.uri).value;
		} else {
			label = this.defaultLabel ?? this.id;
		}

		return { label }
	}

	/**
	 * Get the description of the tree item.
	 * @returns A description string or undefined if no description should be shown.
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
	 * @returns A markdown string or undefined if no tooltip should be shown.
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