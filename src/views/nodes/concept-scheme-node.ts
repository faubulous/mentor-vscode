import * as vscode from "vscode";
import { SKOS } from "@faubulous/mentor-rdf";
import { ConceptNode } from "./concept-node";
import { CollectionNode } from "./collection-node";
import { DefinitionTreeNode } from "../definition-tree-node";

/**
 * Node of a SKOS concept scheme in the definition tree.
 */
export class ConceptSchemeNode extends DefinitionTreeNode {
	contextType = SKOS.ConceptScheme;

	defaultLabel = "Concept Schemes";

	initialCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed;

	override getIcon() {
		return new vscode.ThemeIcon('rdf-concept-scheme', this.getIconColor());
	}

	override getIconColor() {
		return new vscode.ThemeColor("mentor.color.class");
	}

	override getChildren(): DefinitionTreeNode[] {
		if (!this.document) {
			return [];
		}

		const result = [];
		const options = { ...this.options, definedBy: this.uri };

		const concepts = new ConceptNode(this.document, this.id + '/concepts', undefined, options);

		if (concepts.getChildren().length > 0) {
			result.push(concepts);
		}

		const collections = new CollectionNode(this.document, this.id + '/collections', undefined, options);

		if (collections.getChildren().length > 0) {
			result.push(collections);
		}

		return result;
	}
}