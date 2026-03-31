import * as vscode from "vscode";
import { RDFS } from "@faubulous/mentor-rdf";
import { DefinitionTreeNode } from "../definition-tree-node";
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
		const classes = [...this.vocabulary.getClasses(graphs, options)];

		return classes.length.toString();
	}

	override getSubClassIris(): IterableIterator<string> {
		const graphs = this.getOntologyGraphs();
		const options = this.getQueryOptions();

		return this.vocabulary.getSubClasses(graphs, undefined, options);
	}

	override getTooltip(): vscode.MarkdownString | undefined {
		return undefined;
	}

	override resolveNodeForUri(iri: string): DefinitionTreeNode | undefined {
		const graphs = this.getOntologyGraphs();

		if (!this.vocabulary.hasType(graphs, iri, RDFS.Class)) {
			return undefined;
		}

		const options = this.getQueryOptions();

		if (options.includeReferenced) {
			// If referenced classes are included, we want to include classes 
			// that are defined in other ontologies.
			options.definedBy = null;
		}

		const rootToNode = [...this.vocabulary.getRootClassPath(graphs, iri, options)].reverse();
		rootToNode.push(iri);

		return this.walkHierarchyPath(rootToNode);
	}
}