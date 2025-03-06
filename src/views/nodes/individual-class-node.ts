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

		const individuals = mentor.vocabulary.getIndividuals(this.getDocumentGraphs(), this.uri, this.getQueryOptions());

		for (let i of individuals) {
			result.push(new IndividualNode(this.document, this.id + `/<${i}>`, i, this.getQueryOptions()));
		}

		return result;
	}
}