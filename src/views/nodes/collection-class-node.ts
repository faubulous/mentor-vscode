import * as vscode from "vscode";
import { mentor } from "../../mentor";
import { DefinitionTreeNode, sortByLabel } from "../definition-tree-node";
import { ConceptClassNode } from "./concept-class-node";
import { ClassNode } from "./class-node";

/**
 * Node of a SKOS collection in the definition tree.
 */
export class CollectionClassNode extends ClassNode {

	override getIcon() {
		if (this.uri) {
			const isOrdered = mentor.vocabulary.isOrderedCollection(this.document.graphs, this.uri);

			return new vscode.ThemeIcon(isOrdered ? 'rdf-collection-ordered' : 'rdf-collection', this.getIconColor());
		}
	}

	override getIconColor() {
		return new vscode.ThemeColor("mentor.color.concept");
	}

	override getChildren(): DefinitionTreeNode[] {
		if(!this.uri) {
			return [];
		}

		const result = [];

		if (mentor.vocabulary.isOrderedCollection(this.document.graphs, this.uri)) {
			const members = mentor.vocabulary.getCollectionMembers(this.document.graphs, this.uri);

			for (const m of members) {
				result.push(new ConceptClassNode(this.document, this.id + `/<${m}>`, m, this.options));
			}

			return result;
		} else {
			const members = mentor.vocabulary.getCollectionMembers(this.document.graphs, this.uri);

			for (const m of members) {
				result.push(new ConceptClassNode(this.document, this.id + `/<${m}>`, m, this.options));
			}

			return sortByLabel(result);
		}
	}
}