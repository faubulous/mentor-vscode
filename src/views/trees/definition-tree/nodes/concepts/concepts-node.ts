import * as vscode from "vscode";
import { DefinitionTreeNode } from "../../definition-tree-node";
import { ConceptClassNode } from "./concept-class-node";

/**
 * Node that lists the concepts of a concept scheme, or the concepts that are not displayed below
 * any concept scheme if the `inScheme` query option is `null`.
 */
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

	/**
	 * Indicates whether this node lists the concepts that are not displayed below any concept scheme.
	 */
	private _isUnscoped(): boolean {
		return this.getQueryOptions().inScheme === null;
	}

	/**
	 * Get the concepts that can be reached by expanding this node.
	 * @returns An iterator of concept URIs.
	 */
	private _getConcepts(): IterableIterator<string> {
		const graphs = this.getDocumentGraphs();

		if (this._isUnscoped()) {
			return this.vocabulary.getUnscopedConcepts(graphs, this.getQueryOptions());
		}

		return this.vocabulary.getAllConceptsInScheme(graphs, this._getSchemeUri());
	}

	override getDescription(): string {
		// Note: This counts exactly the set of concepts that can be reached by expanding this node.
		this._conceptCount ??= [...this._getConcepts()].length;

		return this._conceptCount.toString();
	}

	override getMemberIris(): string[] {
		// The concepts the count of the node tells about.
		return [...this._getConcepts()];
	}

	override *getSubClassIris(): IterableIterator<string> {
		const graphs = this.getDocumentGraphs();

		if (this._isUnscoped()) {
			yield* this.vocabulary.getUnscopedRootConcepts(graphs, this.getQueryOptions());
		} else {
			yield* this.vocabulary.getNarrowerConcepts(graphs, this._getSchemeUri(), this.getQueryOptions());
		}
	}

	override getTooltip(): vscode.MarkdownString | undefined {
		return undefined;
	}

	override resolveNodeForUri(iri: string): DefinitionTreeNode | undefined {
		// Note: Concepts below a concept scheme are not part of the unscoped concepts and vice versa.
		if (this._isUnscoped() && !new Set(this._getConcepts()).has(iri)) {
			return undefined;
		}

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