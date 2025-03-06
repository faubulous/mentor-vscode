import * as vscode from "vscode";
import { DefinitionTreeNode } from "../definition-tree-node";
import { ConceptGroupNode } from "./concept-group-node";
import { CollectionGroupNode } from "./collection-group-node";

/**
 * Node of a SKOS concept scheme in the definition tree.
 */
export class ConceptSchemeNode extends DefinitionTreeNode {

	override getIcon() {
		return new vscode.ThemeIcon('rdf-concept-scheme', this.getIconColor());
	}

	override getIconColor() {
		return new vscode.ThemeColor("mentor.color.class");
	}

	override getChildren(): DefinitionTreeNode[] {
		const result = [];
		
		const concepts = this.createChildNode(ConceptGroupNode, 'mentor:concepts', { definedBy: this.uri });

		if (concepts.getChildren().length > 0) {
			result.push(concepts);
		}

		const collections = this.createChildNode(CollectionGroupNode, 'mentor:collections', { definedBy: this.uri });

		if (collections.getChildren().length > 0) {
			result.push(collections);
		}

		return result;
	}
}