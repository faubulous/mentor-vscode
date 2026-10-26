import * as vscode from "vscode";
import { any } from '@src/utilities';
import { TreeNode, sortByLabel } from "@src/views/trees/tree-node";
import { DefinitionTreeNode } from "../../definition-tree-node";
import { IndividualNode } from "./individual-node";
import { IndividualClassNode } from "./individual-class-node";

/**
 * Node of a class instance in the definition tree.
 */
export class IndividualsNode extends IndividualClassNode {
	override getContextValue(): string {
		return 'individuals';
	}

	override getIcon() {
		return undefined;
	}

	override getLabel(): vscode.TreeItemLabel {
		return { label: 'Individuals' };
	}

	override getDescription(): string {
		const graphs = this.getDocumentGraphs();
		const options = this.getQueryOptions();
		const individuals = this.vocabulary.getIndividuals(graphs, undefined, options);

		return [...individuals].length.toString();
	}

	/**
	 * Indicates whether the individuals are grouped by their types.
	 */
	private _showIndividualTypes(): boolean {
		return this.settings.get('view.showIndividualTypes', true) === true;
	}

	/**
	 * Get the IRIs of the resources that are listed below this node: the types of the individuals
	 * if they are grouped by type, or the individuals otherwise.
	 * @returns An iterator of resource IRIs.
	 */
	private _getChildIris(): IterableIterator<string> {
		if (this._showIndividualTypes()) {
			return this.vocabulary.getIndividualTypes(this.getOntologyGraphs(), undefined, this.getQueryOptions());
		}

		return this.vocabulary.getIndividuals(this.getDocumentGraphs(), undefined, this.getQueryOptions());
	}

	/**
	 * Indicates whether there are individuals or individual types, stopping at the first one.
	 * @returns `true` if the node has children, `false` otherwise.
	 */
	override hasChildren(): boolean {
		return any(this._getChildIris());
	}

	override getChildren(): TreeNode[] {
		const result = [];
		const showIndividualTypes = this._showIndividualTypes();

		for (const iri of this._getChildIris()) {
			result.push(showIndividualTypes
				? this.createChildNode(IndividualClassNode, iri)
				: this.createChildNode(IndividualNode, iri));
		}

		return sortByLabel(result);
	}

	override getTooltip(): vscode.MarkdownString | undefined {
		return undefined;
	}

	override resolveNodeForUri(iri: string): DefinitionTreeNode | undefined {
		const children = this.getChildren() as DefinitionTreeNode[];

		if (this.settings.get('view.showIndividualTypes', true)) {
			// Individuals are grouped by type — find the matching type node, then the individual within it.
			for (const typeIri of this.vocabulary.getIndividualTypes(this.getDocumentGraphs(), iri)) {
				const typeNode = children.find(n => n.uri === typeIri);

				if (typeNode) {
					const instances = typeNode.getChildren() as DefinitionTreeNode[];
					const found = instances.find(n => n.uri === iri);

					if (found) {
						return found;
					}
				}
			}

			return undefined;
		}

		// Flat list — direct lookup.
		return children.find(n => n.uri === iri);
	}
}