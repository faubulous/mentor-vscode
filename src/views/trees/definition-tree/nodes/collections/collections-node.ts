import * as vscode from "vscode";
import { TreeNode, sortByLabel } from "@src/views/trees/tree-node";
import { DefinitionTreeNode } from "../../definition-tree-node";
import { CollectionClassNode } from "./collection-class-node";

export class CollectionsNode extends CollectionClassNode {
	override getContextValue(): string {
		return 'collections';
	}

	override getIcon(): vscode.ThemeIcon | undefined {
		return undefined;
	}

	override getLabel(): vscode.TreeItemLabel {
		return { label: 'Collections' };
	}

	override getDescription(): string {
		const graphs = this.getDocumentGraphs();
		const options = this.getQueryOptions();

		// Note: The description shows the total number of collections, not only the root collections.
		const collections = [...this.vocabulary.getCollections(graphs, options)];

		return collections.length.toString();
	}

	override hasChildren(): boolean {
		const graphs = this.getDocumentGraphs();
		const options = this.getQueryOptions();

		for (const _ of this.vocabulary.getRootCollections(graphs, options)) {
			return true;
		}

		return false;
	}

	override getChildren(): TreeNode[] {
		const result = [];
		const graphs = this.getDocumentGraphs();
		const options = this.getQueryOptions();

		// Note: Only the collections that are not nested in another collection are listed here.
		// The nested collections are provided by their parent collection nodes.
		for (const c of this.vocabulary.getRootCollections(graphs, options)) {
			result.push(this.createChildNode(CollectionClassNode, c));
		}

		return sortByLabel(result);
	}

	override getTooltip(): vscode.MarkdownString | undefined {
		return undefined;
	}

	override resolveNodeForUri(iri: string): DefinitionTreeNode | undefined {
		const graphs = this.getDocumentGraphs();

		if (!this.vocabulary.isCollection(graphs, iri)) {
			return undefined;
		}

		// The path goes from the collection to its root collection, so it needs to be reversed.
		const rootToNode = this.vocabulary.getRootCollectionPath(graphs, iri).reverse();
		rootToNode.push(iri);

		return this.walkHierarchyPath(rootToNode);
	}
}
