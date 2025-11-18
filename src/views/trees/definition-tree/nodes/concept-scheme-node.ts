import * as vscode from "vscode";
import { DefinitionTreeNode } from "../definition-tree-node";
import { ConceptsNode } from "./concepts-node";
import { CollectionsNode } from "./collections-node";

/**
 * Node of a SKOS concept scheme in the definition tree.
 */
export class ConceptSchemeNode extends DefinitionTreeNode {
	override getIcon() {
		// return undefined;
		return new vscode.ThemeIcon('rdf-concept-scheme', this.getIconColor());
	}

	override getIconColor() {
		return new vscode.ThemeColor("mentor.color.class");
	}

	override hasChildren(): boolean {
		const concepts = this.createChildNode(ConceptsNode, 'mentor:concepts', { definedBy: this.uri });

		if (concepts.hasChildren()) {
			return true;
		}

		const collections = this.createChildNode(CollectionsNode, 'mentor:collections', { definedBy: this.uri });

		if (collections.hasChildren()) {
			return true;
		}

		return false;
	}

	override getChildren(): DefinitionTreeNode[] {
		const result = [];

		const concepts = this.createChildNode(ConceptsNode, 'mentor:concepts', { definedBy: this.uri });

		if (concepts.hasChildren()) {
			result.push(concepts);
		}

		const collections = this.createChildNode(CollectionsNode, 'mentor:collections', { definedBy: this.uri });

		if (collections.hasChildren()) {
			result.push(collections);
		}

		return result;
	}
}