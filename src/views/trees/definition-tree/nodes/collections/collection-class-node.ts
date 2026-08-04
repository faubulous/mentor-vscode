import * as vscode from "vscode";
import { TreeNode, sortByLabel } from "@src/views/trees/tree-node";
import { ConceptClassNode } from "../concepts/concept-class-node";
import { ClassNodeBase } from "../classes/class-node-base";
import { DefinitionTreeNode } from "../../definition-tree-node";

/**
 * Node of a SKOS collection in the definition tree.
 */
export class CollectionClassNode extends ClassNodeBase {
	override getIcon(): vscode.ThemeIcon | undefined {
		const isOrdered = this.vocabulary.isOrderedCollection(this.getDocumentGraphs(), this.uri);

		return new vscode.ThemeIcon(isOrdered ? 'rdf-collection-ordered' : 'rdf-collection', this.getIconColor());
	}

	override getIconColor() {
		return new vscode.ThemeColor("mentor.color.concept");
	}

	override hasChildren(): boolean {
		const graphs = this.getDocumentGraphs();
		const path = this.getPathUris();

		for (const m of this.vocabulary.getCollectionMembers(graphs, this.uri)) {
			if (!path.has(m)) {
				return true;
			}
		}

		return false;
	}

	override getChildren(): TreeNode[] {
		const graphs = this.getDocumentGraphs();
		const path = this.getPathUris();
		const collectionNodes: TreeNode[] = [];
		const conceptNodes: TreeNode[] = [];
		const members: TreeNode[] = [];

		for (const m of this.vocabulary.getCollectionMembers(graphs, this.uri)) {
			// Note: Members that are already on the path to this node are skipped so that cyclic
			// collection definitions cannot be expanded indefinitely.
			if (path.has(m)) {
				continue;
			}

			if (this.vocabulary.isCollection(graphs, m)) {
				const node = this.createChildNode(CollectionClassNode, m);

				collectionNodes.push(node);
				members.push(node);
			} else {
				const node = this.createChildNode(ConceptClassNode, m);

				conceptNodes.push(node);
				members.push(node);
			}
		}

		if (this.vocabulary.isOrderedCollection(graphs, this.uri)) {
			// Preserve the order of the member list for ordered collections.
			return members;
		}

		// Nested collections are listed before the concepts of the collection.
		return [...sortByLabel(collectionNodes), ...sortByLabel(conceptNodes)];
	}

	/**
	 * Get the IRIs of this node and of all its ancestor nodes in the tree.
	 * @returns A set of resource IRIs.
	 */
	protected getPathUris(): Set<string> {
		const result = new Set<string>([this.uri]);

		let parent: DefinitionTreeNode | undefined = this.parent;

		while (parent) {
			result.add(parent.uri);

			parent = parent.parent;
		}

		return result;
	}

	override getClassNode(iri: string) {
		return this.createChildNode(CollectionClassNode, iri);
	}

	override getIndividualNode(iri: string) {
		return this.createChildNode(ConceptClassNode, iri);
	}
}
