import * as vscode from 'vscode';
import { mentor } from '../../mentor';
import { DocumentContext } from "../../languages";
import { DefinitionQueryOptions, RDFS } from "@faubulous/mentor-rdf";
import { DefinitionTreeNode, sortByLabel } from "../definition-tree-node";

export abstract class ResourceNode implements DefinitionTreeNode {
	/**
	 * The unique identifier of the tree item. Note: It must be unique across all tree items 
	 * and thus using the resource IRI is not suitable. In moste cases we encode the path of 
	 * the tree item from the root node using this notation: <parent-iri>/<child-iri>.
	 */
	id: string;

	// TODO: Fix #10 in mentor-rdf; Make this a rdfjs.Quad_Subject instead of string.
	uri: string | undefined;

	// TODO: What is the difference between uri and resourceUri?
	resourceUri?: vscode.Uri | undefined;

	/**
	 * The default label of the tree item if the `uri` property is undefined.
	 */
	defaultLabel: string | undefined;

	document: DocumentContext;

	contextType?: string;

	contextValue: string = 'resource';

	// TODO: Remove.
	options?: DefinitionQueryOptions;

	initialCollapsibleState = vscode.TreeItemCollapsibleState.None;

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

	/**
	 * Get the children of the tree item.
	 */
	abstract getChildren(): DefinitionTreeNode[];

	/**
	 * Get the children of a node of a specific RDF type.
	 * @param graphUris Graph URIs to search for subjects.
	 * @param node The parent node to get the children of.
	 * @param typeUri The type URI of the children to retrieve.
	 * @param createNode A callback function to create a new node.
	 * @returns A list of children nodes.
	 */
	getChildrenOfType(graphUris: string | string[] | undefined, node: DefinitionTreeNode, typeUri: string, createNode: (subjectUri: string) => DefinitionTreeNode): DefinitionTreeNode[] {
		if (!this.document) {
			return [];
		}

		const type = node.uri ? node.uri : typeUri;

		// Include the sub classes of the given type *before* the nodes of the given type.
		const classNodes = [];
		const classes = mentor.vocabulary.getSubClasses(graphUris, type);

		for (let c of classes) {
			if (mentor.vocabulary.hasSubjectsOfType(graphUris, c, node.options)) {
				const n = new ClassNode(this.document, node.id + `/<${c}>`, c, node.options);
				n.contextType = typeUri;

				classNodes.push(n);
			}
		}

		// Include the nodes of the given type *after* the sub classes.
		const subjectNodes = [];

		const subjectUris = mentor.vocabulary.getSubjectsOfType(graphUris, type, {
			...node.options,
			includeSubTypes: false
		});

		for (let s of subjectUris) {
			subjectNodes.push(createNode(s));
		}

		return [
			...sortByLabel(classNodes),
			...sortByLabel(subjectNodes)
		];
	}
}