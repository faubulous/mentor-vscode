import * as vscode from "vscode";
import { mentor } from "../../mentor";
import { ConceptClassNode } from "./concept-class-node";
import { DefinitionTreeNode } from "../definition-tree-node";

export class ConceptGroupNode extends ConceptClassNode {

	contextValue = "concepts";

	override getIcon(): vscode.ThemeIcon | undefined {
		return undefined;
	}

	override getLabel(): vscode.TreeItemLabel {
		return { label: "Concepts" };
	}

	override getDescription(): string {
		const concepts = mentor.vocabulary.getConcepts(this.document.graphs);

		return concepts.length.toString();
	}
}