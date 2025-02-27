import * as vscode from "vscode";
import { mentor } from "../../mentor";
import { DefinitionTreeNode, sortByLabel } from "../definition-tree-node";
import { ConceptNode } from "./concept-node";

/**
 * Node of a SKOS collection in the definition tree.
 */
export class CollectionNode extends DefinitionTreeNode {

	defaultLabel = "Collections";

	override getIcon() {
		if (this.uri) {
			let isOrdered = mentor.vocabulary.isOrderedCollection(this.document.graphs, this.uri);

			return new vscode.ThemeIcon(isOrdered ? 'rdf-collection-ordered' : 'rdf-collection', this.getIconColor());
		} else {
			return undefined;
		}
	}

	override getIconColor() {
		return new vscode.ThemeColor("mentor.color.concept");
	}

	override getDescription(): string {
		let result = super.getDescription();

		if (!this.uri) {
			const members = mentor.vocabulary.getCollections(this.document.graphs);

			result + " " + members.length.toString();
		}

		return result;
	}

	override getChildren(): DefinitionTreeNode[] {
		if (!this.document) {
			return [];
		}

		const result = [];

		if (!this.uri) {
			const collections = mentor.vocabulary.getCollections(this.document.graphs);

			for (const c of collections) {
				result.push(new CollectionNode(this.document, this.id + `/<${c}>`, c, this.options));
			}
		} else if (mentor.vocabulary.isOrderedCollection(this.document.graphs, this.uri)) {
			const members = mentor.vocabulary.getCollectionMembers(this.document.graphs, this.uri);

			for (const m of members) {
				result.push(new ConceptNode(this.document, this.id + `/<${m}>`, m, this.options));
			}

			return result;
		} else {
			const members = mentor.vocabulary.getCollectionMembers(this.document.graphs, this.uri);

			for (const m of members) {
				result.push(new ConceptNode(this.document, this.id + `/<${m}>`, m, this.options));
			}
		}

		return sortByLabel(result);
	}
}