import { container, VocabularyRepository } from "@src/container";
import { TreeNode, sortByLabel } from "@src/views/trees/tree-node";
import { DefinitionTreeNode } from "../definition-tree-node";
import { IndividualNode } from "./individual-node";
import { ClassNodeBase } from "./class-node-base";

/**
 * Node of a class instance in the definition tree.
 */
export class IndividualClassNode extends ClassNodeBase {
	private get vocabulary() {
		return container.resolve(VocabularyRepository);
	}

	override getChildren(): TreeNode[] {
		const result = [];
		const individuals = this.vocabulary.getIndividuals(this.getDocumentGraphs(), this.uri, this.getQueryOptions());

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