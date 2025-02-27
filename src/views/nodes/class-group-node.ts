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
		const classes = mentor.vocabulary.getClasses(this.document.graphs, this.options);

		return classes.length.toString();
	}
}