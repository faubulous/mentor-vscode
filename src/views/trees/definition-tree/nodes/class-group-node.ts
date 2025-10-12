import * as vscode from "vscode";
import { mentor } from "@src/mentor";
import { ClassNode } from "./class-node";

/**
 * Node of a RDFS or OWL class in the definition tree.
 */
export class ClassGroupNode extends ClassNode {
	override getContextValue(): string {
		return 'classes';
	}

	override getIcon(): vscode.ThemeIcon | undefined {
		return undefined;
	}

	override getLabel(): vscode.TreeItemLabel {
		return { label: 'Classes' };
	}

	override getDescription(): string {
		// Note: We only want to display the number of classes defined in the document, hence {@link getDocumentGraphs}.
		const classes = mentor.vocabulary.getClasses(this.getDocumentGraphs(), this.getQueryOptions());

		return classes.length.toString();
	}

	override getSubClassIris(): string[] {
		return mentor.vocabulary.getSubClasses(this.getOntologyGraphs(), undefined, this.getQueryOptions());
	}

	override getTooltip(): vscode.MarkdownString | undefined {
		return undefined;
	}
}