import { OWL } from "@faubulous/mentor-rdf";
import { mentor } from "../../mentor";
import { DefinitionTreeNode, sortByLabel } from "../definition-tree-node";
import { ResourceNodeProvider } from "./resource-node-provider";
import { ClassNode } from "./class-node";
import { IndividualNode } from "./individual-node";

/**
 * A node provider for nodes that represent instances of classes.
 */
export class IndividualNodeProvider extends ResourceNodeProvider {
	/**
	 * Get the children of an invidiual node.
	 * @param node A invidiual node.
	 * @returns An array of child nodes.
	 */
	getNodeChildren(node: DefinitionTreeNode): DefinitionTreeNode[] {
		if (!this.context) {
			return [];
		}

		const result = [];

		if (node.contextValue === "individuals" && this.showIndividualTypes) {
			const types = mentor.vocabulary.getIndividualTypes(this.context.graphs, undefined, node.options);

			for (let t of types) {
				const n = new ClassNode(this.context, node.id + `/<${t}>`, t, node.options);
				n.contextType = OWL.NamedIndividual;

				result.push(n);
			}
		} else {
			const individuals = mentor.vocabulary.getIndividuals(this.context.graphs, node.uri, node.options);

			for (let x of individuals) {
				result.push(new IndividualNode(this.context, node.id + `/<${x}>`, x, node.options));
			}
		}

		return sortByLabel(result);
	}
}