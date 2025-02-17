import { mentor } from "../../mentor";
import { _SH } from "@faubulous/mentor-rdf";
import { DefinitionTreeNode, sortByLabel } from "../definition-tree-node";
import { ResourceNodeProvider } from "./resource-node-provider";
import { CollectionNode } from "./collection-node";
import { ConceptNode } from "./concept-node";

/**
 * A provider for SKOS collection nodes.
 */
export class CollectionNodeProvider extends ResourceNodeProvider {
	/**
	 * Get the children of a collection node.
	 * @param node A collection node.
	 * @returns An array of children.
	 */
	getNodeChildren(node: DefinitionTreeNode): DefinitionTreeNode[] {
		if (!this.context) {
			return [];
		}

		const result = [];

		if (!node.uri) {
			const collections = mentor.vocabulary.getCollections(this.context.graphs);

			for (let c of collections) {
				result.push(new CollectionNode(this.context, node.id + `/<${c}>`, c, node.options));
			}
		} else if (mentor.vocabulary.isOrderedCollection(this.context.graphs, node.uri)) {
			const members = mentor.vocabulary.getCollectionMembers(this.context.graphs, node.uri);

			for (let m of members) {
				result.push(new ConceptNode(this.context, node.id + `/<${m}>`, m, node.options));
			}

			return result;
		} else {
			const members = mentor.vocabulary.getCollectionMembers(this.context.graphs, node.uri);

			for (let m of members) {
				result.push(new ConceptNode(this.context, node.id + `/<${m}>`, m, node.options));
			}
		}

		return sortByLabel(result);
	}
}