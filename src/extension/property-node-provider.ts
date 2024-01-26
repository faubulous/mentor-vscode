import * as vscode from 'vscode';
import { OntologyRepository } from '@faubulous/mentor-rdf';
import { DocumentContext } from '../document-context';
import { PropertyNode } from './property-node';
import { ResourceNodeProvider } from './resource-node-provider';
import { ClassNode } from './class-node';

/**
 * A tree node provider for RDF properties.
 */
export class PropertyNodeProvider extends ResourceNodeProvider<OntologyRepository> {
	/**
	 * Indicates whether the property type should be shown as root nodes in the tree.
	 */
	public showTypes: boolean = true;

	/**
	 * A set of URIs that are used for marking the nodes as classes for the getTreeItem method.
	 */
	classNodes: any = {};

	override getParent(uri: string): string | undefined {
		return undefined;
	}

	override getChildren(uri: string): string[] {
		if (this.context) {
			let result;

			if (!uri) {
				if (this.showTypes) {
					result = this.context.repository.getPropertyTypes(this.context.graphs).sort();

					// Mark the nodes as classes for the getTreeItem method.
					result.forEach((type: string) => this.classNodes[type] = true);
				} else {
					result = this.context.repository.getProperties(this.context.graphs).sort();
				}
			} else if (this.classNodes[uri]) {
				result = this.context.repository.getPropertiesOfType(this.context.graphs, uri, false).sort();
			} else {
				result = this.context.repository.getSubProperties(this.context.graphs, uri).sort();
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
				return new PropertyNode(this.context, uri);
			}
		} else {
			throw new Error('Invalid context.');
		}
	}

	override getTotalItemCount(): number {
		if (this.context) {
			return this.context.repository.getProperties(this.context.graphs).length;
		} else {
			return 0;
		}
	}
}