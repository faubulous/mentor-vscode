import { RDF } from "@faubulous/mentor-rdf";
import { mentor } from "../../mentor";
import { DefinitionTreeNode, sortByLabel } from "../definition-tree-node";
import { ResourceNodeProvider } from "./resource-node-provider";
import { ClassNode } from "./class-node";
import { PropertyNode } from "./property-node";

/**
 * A node provider for nodes that represent RDF or OWL properties.
 */
export class PropertyNodeProvider extends ResourceNodeProvider {
	/**
	 * Get the children of a property node.
	 * @param node A property node.
	 * @returns An array of child nodes.
	 */
	getNodeChildren(node: DefinitionTreeNode): DefinitionTreeNode[] {
		if (!this.context) {
			return [];
		}

		const result = [];

		if (node.contextValue === "properties" && this.showPropertyTypes) {
			const types = mentor.vocabulary.getPropertyTypes(this.context.graphs, node.options);

			for (let type of types) {
				const n = new ClassNode(this.context, node.id + `/<${type}>`, type, node.options);
				n.contextType = RDF.Property;

				result.push(n);
			}
		} else if (node instanceof ClassNode) {
			// Note: We only want to return the asserted properties here.
			let properties = mentor.vocabulary.getRootPropertiesOfType(this.context.graphs, node.uri!, node.options);

			for (let p of properties) {
				result.push(new PropertyNode(this.context, node.id + `/<${p}>`, p, node.options));
			}
		} else {
			const properties = mentor.vocabulary.getSubProperties(this.context.graphs, node.uri, node.options);

			for (let p of properties) {
				result.push(new PropertyNode(this.context, node.id + `/<${p}>`, p, node.options));
			}
		}

		return sortByLabel(result);
	}
}