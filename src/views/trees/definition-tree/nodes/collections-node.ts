import * as vscode from "vscode";
import { mentor } from "@src/mentor";
import { TreeNode, sortByLabel } from "@src/views/trees/tree-node";
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
		const collections = [...mentor.vocabulary.getCollections(graphs)];

		return collections.length.toString();
	}

	override hasChildren(): boolean {
		const graphs = this.getDocumentGraphs();

		for(const _ of mentor.vocabulary.getCollections(graphs)) {
			return true;
		}

		return false;
	}

	override getChildren(): TreeNode[] {
		const result = [];
		const graphs = this.getDocumentGraphs();
		const collections = [...mentor.vocabulary.getCollections(graphs)];

		for (const c of collections) {
			result.push(this.createChildNode(CollectionClassNode, c));
		}

		return sortByLabel(result);
	}

	override getTooltip(): vscode.MarkdownString | undefined {
		return undefined;
	}
}