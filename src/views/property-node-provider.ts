import * as vscode from 'vscode';
import * as mentor from '../mentor';
import { PropertyNode } from './property-node';
import { ResourceNodeProvider } from './resource-node-provider';
import { ClassNode } from './class-node';

/**
 * A tree node provider for RDF properties.
 */
export class PropertyNodeProvider extends ResourceNodeProvider {
	id = 'property';

	/**
	 * Indicates whether the property type should be shown as root nodes in the tree.
	 */
	public showTypes: boolean = true;

	/**
	 * A set of URIs that are used for marking the nodes as classes for the getTreeItem method.
	 */
	classNodes: any = {};

	override getTitle(): string {
		return "Properties";
	}

	override getParent(id: string): string | undefined {
		return undefined;
	}

	override getChildren(id: string): string[] {
		if (this.context) {
			let result;

			const uri = this.getUri(id);

			if (!uri) {
				if (this.showTypes) {
					result = mentor.vocabulary.getPropertyTypes(this.context.graphs).sort();

					// Mark the nodes as classes for the getTreeItem method.
					result.forEach((typeUri: string) => this.classNodes[this.getId(typeUri)] = true);
				} else {
					result = mentor.vocabulary.getProperties(this.context.graphs).sort();
				}
			} else if (this.classNodes[id]) {
				result = mentor.vocabulary.getPropertiesOfType(this.context.graphs, uri, false).sort();
			} else {
				result = mentor.vocabulary.getSubProperties(this.context.graphs, uri).sort();
			}

			return this.sortByLabel(result).map(u => this.getId(u, uri));
		} else {
			return [];
		}
	}

	override getTreeItem(id: string): vscode.TreeItem {
		if (this.classNodes[id]) {
			return new ClassNode(this.context!, id, vscode.TreeItemCollapsibleState.Collapsed);
		} else {
			return new PropertyNode(this.context!, id);
		}
	}

	override getTotalItemCount(): number {
		if (this.context) {
			return mentor.vocabulary.getProperties(this.context.graphs).length;
		} else {
			return 0;
		}
	}
}