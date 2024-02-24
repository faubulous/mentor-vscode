import * as vscode from 'vscode';
import * as mentor from '../mentor';
import { IndividualNode } from './individual-node';
import { ResourceNodeProvider } from './resource-node-provider';
import { ClassNode } from './class-node';

/**
 * A tree node provider for RDFS or OWL properties.
 */
export class IndividualNodeProvider extends ResourceNodeProvider {
	id = 'individual';

	/**
	 * Indicates whether the individual type should be shown as root nodes in the tree.
	 */
	showTypes: boolean = true;

	/**
	 * A set of URIs that are used for marking the nodes as classes for the getTreeItem method.
	 */
	classNodes: any = {};

	override getTitle(): string {
		return "Individuals";
	}

	override getParent(uri: string): string | undefined {
		if (this.context) {
			return mentor.ontology.getIndividualTypes(this.context.graphs, uri).sort().slice(0, 1)[0];
		} else {
			return undefined;
		}
	}

	override getChildren(uri: string): string[] {
		if (this.context) {
			let result;

			if (uri || !this.showTypes) {
				result = mentor.ontology.getIndividuals(this.context.graphs, uri).sort();
			} else {
				result = mentor.ontology.getIndividualTypes(this.context.graphs).sort();

				// Mark the nodes as classes for the getTreeItem method.
				result.forEach((type: string) => this.classNodes[type] = true);
			}

			return result;
		} else {
			return [];
		}
	}

	override getTreeItem(uri: string): vscode.TreeItem {
		if (this.context) {
			if (this.classNodes[uri]) {
				return new ClassNode(this.context, uri, vscode.TreeItemCollapsibleState.Collapsed);
			} else {
				return new IndividualNode(this.context, uri);
			}
		} else {
			throw new Error('Invalid context.');
		}
	}

	override getTotalItemCount(): number {
		if (this.context) {
			return mentor.ontology.getIndividuals(this.context.graphs).length;
		} else {
			return 0;
		}
	}
}