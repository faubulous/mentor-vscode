import * as vscode from "vscode";
import { mentor } from "../../mentor";
import { DefinitionTreeNode, sortByLabel} from "../definition-tree-node";
import { CollectionClassNode } from "./collection-class-node";

export class CollectionGroupNode extends CollectionClassNode {

	contextValue = "collections";

	override getIcon(): vscode.ThemeIcon | undefined {
		return undefined;
	}

	override getLabel(): vscode.TreeItemLabel {
		return { label: "Collections" };
	}

	override getDescription(): string {
		const collections = mentor.vocabulary.getCollections(this.document.graphs);

		return collections.length.toString();
	}

	override getChildren(): DefinitionTreeNode[] {
		const result = [];
		const collections = mentor.vocabulary.getCollections(this.document.graphs);

		for (const c of collections) {
			result.push(new CollectionClassNode(this.document, this.id + `/<${c}>`, c, this.options));
		}

		return sortByLabel(result);
	}
}