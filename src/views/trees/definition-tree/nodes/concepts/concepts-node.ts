import * as vscode from "vscode";
import { DefinitionTreeNode } from "../../definition-tree-node";
import { ConceptClassNode } from "./concept-class-node";

export class ConceptsNode extends ConceptClassNode {
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
		const graphs = this.getDocumentGraphs();
		const concepts = [...this.vocabulary.getConcepts(graphs)];

		return concepts.length.toString();
	}

	override *getSubClassIris(): IterableIterator<string> {
		const graphs = this.getDocumentGraphs();
		const subject = this.getQueryOptions().definedBy ?? this.uri;

		yield* this.vocabulary.getNarrowerConcepts(graphs, subject);
	}

	override getTooltip(): vscode.MarkdownString | undefined {
		return undefined;
	}

	override resolveNodeForUri(iri: string): DefinitionTreeNode | undefined {
		const graphs = this.getDocumentGraphs();
		const path = this.vocabulary.getConceptSchemePath(graphs, iri);

		if (!path || path.length === 0) {
			return undefined;
		}

		// The path goes from concept to scheme root — reverse it and drop the
		// scheme itself (which is the ConceptSchemeNode parent, not a child here).
		const rootToTarget = path.reverse();
		const schemeUri = this.getQueryOptions().definedBy ?? this.uri;
		const schemeIndex = rootToTarget.indexOf(schemeUri);

		const walkPath = schemeIndex >= 0
			? rootToTarget.slice(schemeIndex + 1)
			: rootToTarget;

		if (walkPath.length === 0) {
			return undefined;
		}

		return this.walkHierarchyPath(walkPath);
	}
}