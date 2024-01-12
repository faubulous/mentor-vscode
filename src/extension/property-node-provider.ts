import * as vscode from 'vscode';
import { DocumentContext } from '../mentor';
import { ClassRepository, PropertyRepository, RDF } from '@faubulous/mentor-rdf';
import { PropertyNode } from './property-node';
import { ResourceNodeProvider } from './resource-node-provider';
import { ClassNode } from './class-node';

/**
 * A tree node provider for RDF properties.
 */
export class PropertyNodeProvider extends ResourceNodeProvider<PropertyRepository> {
	public showTypes: boolean = true;

	/**
	 * If defined, show only properties with the given domain.
	 */
	domainFilter: string | undefined;

	/**
	 * A class repository that is used for creating individual type nodes.
	 */
	classRepository: ClassRepository | undefined;

	/**
	 * A set of URIs that are used for marking the nodes as classes for the getTreeItem method.
	 */
	classNodes: any = {};

	override onDidChangeVocabularyContext(context: DocumentContext): void {
		if (context?.store) {
			this.repository = new PropertyRepository(context.store);
			this.classRepository = new ClassRepository(context.store);
		} else {
			this.repository = undefined;
			this.classRepository = undefined;
		}
	}

	override getParent(uri: string): string | undefined {
		return undefined;
	}

	override getChildren(uri: string): string[] {
		if (!this.repository) {
			return [];
		}

		let result;

		if (!uri) {
			if (this.showTypes) {
				result = this.repository.getPropertyTypes().sort();

				// Mark the nodes as classes for the getTreeItem method.
				result.forEach((type: string) => this.classNodes[type] = true);
			} else {
				result = this.repository.getProperties().sort();
			}
		} else if (this.classNodes[uri]) {
			result = this.repository.getPropertiesOfType(uri, false).sort();
		} else {
			result = this.repository.getSubProperties(uri).sort();
		}

		return result;
	}

	override getTreeItem(uri: string): vscode.TreeItem {
		if (this.classNodes[uri]) {
			return new ClassNode(this.classRepository!, uri, vscode.TreeItemCollapsibleState.Collapsed);
		} else {
			return new PropertyNode(this.repository!, uri);
		}
	}

	override getTotalItemCount(): number {
		return this.repository ? this.repository.getProperties().length : 0;
	}
}