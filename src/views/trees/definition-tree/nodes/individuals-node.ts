import * as vscode from "vscode";
import { mentor } from "@src/mentor";
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
		const individuals = mentor.vocabulary.getIndividuals(this.getDocumentGraphs(), undefined, this.getQueryOptions());

		return individuals.length.toString();
	}

	override hasChildren(): boolean {
		for (const _ of this.getChildren()) {
			return true;
		}

		return false;
	}

	override getChildren(): TreeNode[] {
		const result = [];
		const showIndividualTypes = mentor.settings.get('view.showIndividualTypes', true);

		if (showIndividualTypes) {
			const types = mentor.vocabulary.getIndividualTypes(this.getOntologyGraphs(), undefined, this.getQueryOptions());

			for (let t of types) {
				result.push(this.createChildNode(IndividualClassNode, t));
			}
		} else {
			const individuals = mentor.vocabulary.getIndividuals(this.getDocumentGraphs(), undefined, this.getQueryOptions());

			for (let i of individuals) {
				result.push(this.createChildNode(IndividualNode, i));
			}
		}

		return sortByLabel(result);
	}

	override getTooltip(): vscode.MarkdownString | undefined {
		return undefined;
	}
}