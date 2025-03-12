import { mentor } from "../../mentor";
import { DefinitionTreeNode, sortByLabel } from "../definition-tree-node";
import { ClassNodeBase } from "./class-node-base";
import { PropertyNode } from "./property-node";

/**
 * Node of a property in the definition tree.
 */
export class PropertyClassNode extends ClassNodeBase {
	override getChildren(): DefinitionTreeNode[] {
		const result = [];
		const properties = mentor.vocabulary.getRootPropertiesOfType(this.getDocumentGraphs(), this.uri!, this.getQueryOptions());

		for (const p of properties) {
			result.push(this.createChildNode(PropertyNode, p));
		}

		return sortByLabel(result);
	}

	override getClassNode(iri: string) {
		return this.createChildNode(PropertyClassNode, iri);
	}

	override getIndividualNode(iri: string) {
		return this.createChildNode(PropertyNode, iri);
	}
}