import { mentor } from "../../mentor";
import { DocumentContext } from "../../languages";
import { DefinitionTreeNode, sortByLabel } from "../definition-tree-node";
import { ClassNode } from "./class-node";

/**
 * A factory class that provides tree nodes which represent generic resources.
 */
export abstract class ResourceNodeProvider {
	/**
	 * The RDF document context.
	 */
	context: DocumentContext | undefined;

	constructor(context: DocumentContext | undefined) {
		this.context = context;
	}

	/**
	 * Get the children of a node or root nodes.
	 * @param node The parent node to get the children of, or undefined if root nodes are requested.
	 */
	abstract getNodeChildren(node: DefinitionTreeNode): DefinitionTreeNode[];

	/**
	 * Get the children of a node of a specific RDF type.
	 * @param graphUris Graph URIs to search for subjects.
	 * @param node The parent node to get the children of.
	 * @param typeUri The type URI of the children to retrieve.
	 * @param createNode A callback function to create a new node.
	 * @returns A list of children nodes.
	 */
	getNodeChildrenOfType(graphUris: string | string[] | undefined, node: DefinitionTreeNode, typeUri: string, createNode: (subjectUri: string) => DefinitionTreeNode): DefinitionTreeNode[] {
		if (!this.context) {
			return [];
		}

		const type = node.uri ? node.uri : typeUri;

		// Include the sub classes of the given type *before* the nodes of the given type.
		const classNodes = [];
		const classes = mentor.vocabulary.getSubClasses(graphUris, type);

		for (let c of classes) {
			if (mentor.vocabulary.hasSubjectsOfType(graphUris, c, node.options)) {
				const n = new ClassNode(this.context, node.id + `/<${c}>`, c, node.options);
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