import { mentor } from "@/mentor";
import { DefinitionTreeNode, sortByLabel } from "../definition-tree-node";
import { IndividualNode } from "./individual-node";
import { ClassNodeBase } from "./class-node-base";

/**
 * Node of a class instance in the definition tree.
 */
export class IndividualClassNode extends ClassNodeBase {
	override getChildren(): DefinitionTreeNode[] {
		const result = [];
		const individuals = mentor.vocabulary.getIndividuals(this.getDocumentGraphs(), this.uri, this.getQueryOptions());

		for (let i of individuals) {
			result.push(this.createChildNode(IndividualNode, i));
		}

		return sortByLabel(result);
	}

	override getClassNode(iri: string): DefinitionTreeNode {
		return this.createChildNode(IndividualClassNode, iri);
	}

	override getIndividualNode(iri: string): DefinitionTreeNode {
		return this.createChildNode(IndividualNode, iri);
	}
}