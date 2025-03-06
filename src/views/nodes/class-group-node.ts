import * as vscode from "vscode";
import { mentor } from "../../mentor";
import { ClassNode } from "./class-node";

/**
 * Node of a RDFS or OWL class in the definition tree.
 */
export class ClassGroupNode extends ClassNode {
	contextValue = "classes";

	override getIcon(): vscode.ThemeIcon | undefined {
		return undefined;
	}

	override getLabel(): vscode.TreeItemLabel {
		return { label: "Classes" };
	}

	override getDescription(): string {
		// Note: We only want to display the number of classes defined in the document.
		const classes = mentor.vocabulary.getClasses(this.getDocumentGraphs(), this.getQueryOptions());

		return classes.length.toString();
	}
}