import { mentor } from "../../mentor";
import { DefinitionTreeNode } from "../definition-tree-node";
import { IndividualNode } from "./individual-node";
import { ClassNode } from "./class-node";

/**
 * Node of a class instance in the definition tree.
 */
export class IndividualClassNode extends ClassNode {
	override getChildren(): DefinitionTreeNode[] {
		const result = [];
		const individuals = mentor.vocabulary.getIndividuals(this.document.graphs, this.uri, this.options);

		for (let i of individuals) {
			result.push(new IndividualNode(this.document, this.id + `/<${i}>`, i, this.options));
		}

		return result;
	}
}