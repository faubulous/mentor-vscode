import * as vscode from "vscode";
import { mentor } from "../../mentor";
import { ConceptClassNode } from "./concept-class-node";

export class ConceptGroupNode extends ConceptClassNode {
	override getContextValue(): string {
		return 'concepts';
	}

	override getIcon(): vscode.ThemeIcon | undefined {
		return undefined;
	}

	override getLabel(): vscode.TreeItemLabel {
		return { label: 'Concepts' };
	}

	override getDescription(): string {
		const concepts = mentor.vocabulary.getConcepts(this.getDocumentGraphs());

		return concepts.length.toString();
	}
}