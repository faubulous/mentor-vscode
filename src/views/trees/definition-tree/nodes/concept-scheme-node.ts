import * as vscode from "vscode";
import { DefinitionTreeNode } from "../definition-tree-node";
import { GroupContainerNode } from "./group-container-node";
import { ConceptsNode } from "./concepts/concepts-node";
import { CollectionsNode } from "./collections/collections-node";

/**
 * Node of a SKOS concept scheme in the definition tree.
 */
export class ConceptSchemeNode extends GroupContainerNode {
	override getIcon() {
		return new vscode.ThemeIcon('rdf-concept-scheme', this.getIconColor());
	}

	override getIconColor() {
		return new vscode.ThemeColor("mentor.color.class");
	}

	/**
	 * Create the group nodes that may be listed below this node, whether they have children or not.
	 * @returns The group nodes in the order they are displayed.
	 */
	protected override createGroupNodes(): DefinitionTreeNode[] {
		// Note: Concepts and collections are associated with a concept scheme via skos:inScheme, so the
		// definedBy option that is inherited from this node must not be applied to them.
		return [
			this.createChildNode(ConceptsNode, 'mentor:concepts', { definedBy: undefined, inScheme: this.uri }),
			this.createChildNode(CollectionsNode, 'mentor:collections', { definedBy: undefined, inScheme: this.uri })
		];
	}
}