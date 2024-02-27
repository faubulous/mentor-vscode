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

	override getParent(id: string): string | undefined {
		if (this.context && id) {
			const uri = this.getUri(id)!;
			
			return mentor.ontology.getIndividualTypes(this.context.graphs, uri).sort().slice(0, 1)[0];
		} else {
			return undefined;
		}
	}

	override getChildren(id: string): string[] {
		if (this.context) {
			let result;

			if (id || !this.showTypes) {
				const uri = this.getUri(id);

				result = mentor.ontology.getIndividuals(this.context.graphs, uri).sort();
			} else {
				result = mentor.ontology.getIndividualTypes(this.context.graphs).sort();

				// Mark the nodes as classes for the getTreeItem method.
				result.forEach((type: string) => this.classNodes[type] = true);
			}

			return this.sortByLabel(result).map(uri => this.getId(uri));
		} else {
			return [];
		}
	}

	override getTreeItem(id: string): vscode.TreeItem {
		if (this.context) {
			if (this.classNodes[id]) {
				return new ClassNode(this.context, id, vscode.TreeItemCollapsibleState.Collapsed);
			} else {
				return new IndividualNode(this.context, id);
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