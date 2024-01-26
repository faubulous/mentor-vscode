import * as vscode from 'vscode';
import { OntologyRepository } from '@faubulous/mentor-rdf';
import { ClassNode } from './class-node';
import { ResourceNodeProvider } from './resource-node-provider';

/**
 * A tree node provider for RDF classes.
 */
export class ClassNodeProvider extends ResourceNodeProvider<OntologyRepository> {
	/**
	 * Indicates whether classes should be included in the tree that are not explicitly defined in the ontology.
	 */
	public showReferenced: boolean = false;

	override getParent(uri: string): string | undefined {
		if (this.context) {
			let result = this.context.repository.getSuperClasses(this.context.graphs, uri).sort().slice(0, 1);

			return result.length > 0 ? result[0] : undefined;
		} else {
			return undefined;
		}
	}

	override getChildren(uri: string): string[] {
		if (this.context) {
			let options = { includeReferencedClasses: this.showReferenced };
			let result = this.context.repository.getSubClasses(this.context.graphs, uri, options).sort();

			return result;
		} else {
			return [];
		}
	}

	override getTreeItem(uri: string): vscode.TreeItem {
		if (this.context) {
			return new ClassNode(this.context, uri);
		} else {
			throw new Error('Invalid context.');
		}
	}

	override getTotalItemCount(): number {
		if (this.context) {
			return this.context.repository.getClasses(this.context.graphs, { includeReferencedClasses: false }).length;
		} else {
			return 0;
		}
	}
}