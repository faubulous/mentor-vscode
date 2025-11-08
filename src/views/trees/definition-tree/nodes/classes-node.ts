import * as vscode from "vscode";
import { mentor } from "@src/mentor";
import { ClassNode } from "./class-node";

/**
 * The group node representing all classes defined in the document.
 */
export class ClassesNode extends ClassNode {
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
		const graphs = this.getOntologyGraphs();
		const options = this.getQueryOptions();

		// Note: We only want to display the number of classes defined in the document, hence {@link getDocumentGraphs}.
		const classes = [...mentor.vocabulary.getClasses(graphs, options)];

		return classes.length.toString();
	}

	override getSubClassIris(): IterableIterator<string> {
		const graphs = this.getOntologyGraphs();
		const options = this.getQueryOptions();

		return mentor.vocabulary.getSubClasses(graphs, undefined, options);
	}

	override getTooltip(): vscode.MarkdownString | undefined {
		return undefined;
	}
}