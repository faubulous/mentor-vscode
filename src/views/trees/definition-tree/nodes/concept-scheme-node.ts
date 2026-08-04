import * as vscode from "vscode";
import { DefinitionTreeNode } from "../definition-tree-node";
import { ConceptsNode } from "./concepts/concepts-node";
import { CollectionsNode } from "./collections/collections-node";

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

	override hasChildren(): boolean {
		const concepts = this.createChildNode(ConceptsNode, 'mentor:concepts', { definedBy: this.uri });

		if (concepts.hasChildren()) {
			return true;
		}

		// Note: Collections are associated with a concept scheme via skos:inScheme, so the definedBy
		// option that is inherited from this node must not be applied to them.
		const collections = this.createChildNode(CollectionsNode, 'mentor:collections', { definedBy: undefined, inScheme: this.uri });

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

		// Note: Collections are associated with a concept scheme via skos:inScheme, so the definedBy
		// option that is inherited from this node must not be applied to them.
		const collections = this.createChildNode(CollectionsNode, 'mentor:collections', { definedBy: undefined, inScheme: this.uri });

		if (collections.hasChildren()) {
			result.push(collections);
		}

		return result;
	}

	override resolveNodeForUri(iri: string): DefinitionTreeNode | undefined {
		for (const child of this.getChildren()) {
			const found = child.resolveNodeForUri(iri);

			if (found) {
				return found;
			}
		}

		return undefined;
	}
}