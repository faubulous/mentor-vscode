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

	/**
	 * The number of concepts below this node, computed once per node. Counting them traverses the
	 * whole concept scheme, and the provider recreates all nodes on refresh, so it is safe and
	 * worthwhile to memoize here — see the note on {@link DefinitionTreeNode.getLabel}.
	 */
	private _conceptCount: number | undefined;

	/**
	 * Get the URI of the concept scheme whose concepts are displayed below this node.
	 * @returns The URI of a concept scheme.
	 */
	private _getSchemeUri(): string {
		return this.getQueryOptions().inScheme ?? this.uri;
	}

	override getDescription(): string {
		const graphs = this.getDocumentGraphs();

		// Note: This counts the concepts of *this* concept scheme, which is exactly the set of
		// concepts that can be reached by expanding this node.
		this._conceptCount ??= [...this.vocabulary.getAllConceptsInScheme(graphs, this._getSchemeUri())].length;

		return this._conceptCount.toString();
	}

	override *getSubClassIris(): IterableIterator<string> {
		const graphs = this.getDocumentGraphs();
		const scheme = this._getSchemeUri();

		yield* this.vocabulary.getNarrowerConcepts(graphs, scheme, this.getQueryOptions());
	}

	override getTooltip(): vscode.MarkdownString | undefined {
		return undefined;
	}

	override resolveNodeForUri(iri: string): DefinitionTreeNode | undefined {
		const graphs = this.getDocumentGraphs();
		const path = this.vocabulary.getConceptSchemePath(graphs, iri) ?? [];

		// The path contains the broader concepts of the concept, ordered from the closest broader
		// concept to the scheme root, so it needs to be reversed. The scheme itself is dropped
		// because it is the ConceptSchemeNode parent, not a child here.
		const rootToTarget = [...path].reverse();
		const schemeUri = this._getSchemeUri();
		const schemeIndex = rootToTarget.indexOf(schemeUri);

		const walkPath = schemeIndex >= 0
			? rootToTarget.slice(schemeIndex + 1)
			: rootToTarget;

		// The path does not contain the concept itself, which is the node we are looking for.
		walkPath.push(iri);

		return this.walkHierarchyPath(walkPath);
	}
}