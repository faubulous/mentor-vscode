import { _SH } from "@faubulous/mentor-rdf";
import { ResourceNodeProvider } from "./resource-node-provider";
import { DefinitionTreeNode, sortByLabel } from "../definition-tree-node";
import { ConceptNode } from "./concept-node";
import { mentor } from "../../mentor";

/**
 * A provider for SKOS concept nodes.
 */
export class ConceptNodeProvider extends ResourceNodeProvider {
	/**
	 * Get the children of a concept node.
	 * @param node A concept node.
	 * @returns An array of children.
	 */
	getNodeChildren(node: DefinitionTreeNode): DefinitionTreeNode[] {
		if (!this.context) {
			return [];
		}

		let subject = node.uri;

		if (!subject && node.options?.definedBy) {
			subject = node.options.definedBy;
		}

		const result = [];

		for (let c of mentor.vocabulary.getNarrowerConcepts(this.context.graphs, subject)) {
			result.push(new ConceptNode(this.context, node.id + `/<${c}>`, c, node.options));
		}

		return sortByLabel(result);
	}
}