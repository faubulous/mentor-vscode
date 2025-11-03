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
		const collections = mentor.vocabulary.getCollections(this.getDocumentGraphs());

		return collections.length.toString();
	}

	override getChildren(): TreeNode[] {
		const result = [];
		const collections = mentor.vocabulary.getCollections(this.getDocumentGraphs());

		for (const c of collections) {
			result.push(this.createChildNode(CollectionClassNode, c));
		}

		return sortByLabel(result);
	}

	override getTooltip(): vscode.MarkdownString | undefined {
		return undefined;
	}
}