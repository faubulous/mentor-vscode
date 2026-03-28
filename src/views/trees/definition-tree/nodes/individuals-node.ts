import * as vscode from "vscode";
import { TreeNode, sortByLabel } from "@src/views/trees/tree-node";
import { DefinitionTreeNode } from "../definition-tree-node";
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

	override hasChildren(): boolean {
		for (const _ of this.getChildren()) {
			return true;
		}

		return false;
	}

	override getChildren(): TreeNode[] {
		const result = [];
		const showIndividualTypes = this.settings.get('view.showIndividualTypes', true);

		if (showIndividualTypes) {
			const types = this.vocabulary.getIndividualTypes(this.getOntologyGraphs(), undefined, this.getQueryOptions());

			for (let t of types) {
				result.push(this.createChildNode(IndividualClassNode, t));
			}
		} else {
			const individuals = this.vocabulary.getIndividuals(this.getDocumentGraphs(), undefined, this.getQueryOptions());

			for (let i of individuals) {
				result.push(this.createChildNode(IndividualNode, i));
			}
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