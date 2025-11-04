import * as vscode from "vscode";
import { mentor } from "@src/mentor";
import { TreeNode, sortByLabel } from "@src/views/trees/tree-node";
import { ConceptClassNode } from "./concept-class-node";
import { ClassNodeBase } from "./class-node-base";

/**
 * Node of a SKOS collection in the definition tree.
 */
export class CollectionClassNode extends ClassNodeBase {
	override getIcon(): vscode.ThemeIcon | undefined {
		const isOrdered = mentor.vocabulary.isOrderedCollection(this.getDocumentGraphs(), this.uri);

		return new vscode.ThemeIcon(isOrdered ? 'rdf-collection-ordered' : 'rdf-collection', this.getIconColor());
	}

	override getIconColor() {
		return new vscode.ThemeColor("mentor.color.concept");
	}

	override hasChildren(): boolean {
		const graphs = this.getDocumentGraphs();

		for (const _ of mentor.vocabulary.getCollectionMembers(graphs, this.uri)) {
			return true;
		}

		return false;
	}

	override getChildren(): TreeNode[] {
		const result = [];
		const graphs = this.getDocumentGraphs();

		for (const m of mentor.vocabulary.getCollectionMembers(graphs, this.uri)) {
			result.push(this.createChildNode(ConceptClassNode, m));
		}

		if (mentor.vocabulary.isOrderedCollection(graphs, this.uri)) {
			// Preserve order for ordered collections.
			return result;
		} else {
			return sortByLabel(result);
		}
	}

	override getClassNode(iri: string) {
		return this.createChildNode(ConceptClassNode, iri);
	}

	override getIndividualNode(iri: string) {
		return this.createChildNode(ConceptClassNode, iri);
	}
}