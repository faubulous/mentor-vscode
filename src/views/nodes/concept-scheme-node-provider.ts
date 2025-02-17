import { _SH } from "@faubulous/mentor-rdf";
import { DefinitionTreeNode } from "../definition-tree-node";
import { ResourceNodeProvider } from "./resource-node-provider";
import { CollectionNode } from "./collection-node";
import { ConceptNode } from "./concept-node";

/**
 * A node provider for SKOS concept scheme nodes.
 */
export class ConceptSchemeNodeProvider extends ResourceNodeProvider {
	/**
	 * Get the children of a SKOS concept scheme node.
	 * @param node A concept scheme node.
	 * @returns An array of children.
	 */
	getNodeChildren(node: DefinitionTreeNode): DefinitionTreeNode[] {
		if (!this.context) {
			return [];
		}

		const result = [];
		const options = { ...node.options, definedBy: node.uri };

		const concepts = new ConceptNode(this.context, node.id + '/concepts', undefined, options);

		if (this.getConceptNodeChildren(concepts).length > 0) {
			result.push(concepts);
		}

		const collections = new CollectionNode(this.context, node.id + '/collections', undefined, options);

		if (this.getCollectionNodeChildren(collections).length > 0) {
			result.push(collections);
		}

		return result;
	}
}