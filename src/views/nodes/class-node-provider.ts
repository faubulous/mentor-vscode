import { mentor } from "../../mentor";
import { ResourceNodeProvider } from "./resource-node-provider";
import { DefinitionTreeNode, sortByLabel } from "../definition-tree-node";
import { ClassNode } from "./class-node";

/**
 * A provider for RDFS or OWL class nodes.
 */
export class ClassNodeProvider extends ResourceNodeProvider {
	/**
	 * Get the children of a class node.
	 * @param node A class node.
	 * @returns An array of children.
	 */
	getNodeChildren(node: DefinitionTreeNode): DefinitionTreeNode[] {
		if (!this.context) {
			return [];
		}

		const result = [];
		const classes = mentor.vocabulary.getSubClasses(this.context.graphs, node.uri, node.options);

		for (let c of classes) {
			result.push(new ClassNode(this.context, node.id + `/<${c}>`, c, node.options));
		}

		return sortByLabel(result);
	}
}