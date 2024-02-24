import * as vscode from 'vscode';
import * as mentor from '../mentor';
import { ClassNode } from './class-node';
import { ResourceNodeProvider } from './resource-node-provider';

/**
 * A tree node provider for RDFS or OWL classes.
 */
export class ClassNodeProvider extends ResourceNodeProvider {
	id = "class";

	/**
	 * Indicates whether classes should be included in the tree that are not explicitly defined in the ontology.
	 */
	showReferenced: boolean = false;

	override getTitle(): string {
		return "Classes";
	}

	override getParent(uri: string): string | undefined {
		if (this.context) {
			let result = mentor.ontology.getSuperClasses(this.context.graphs, uri).sort().slice(0, 1);

			return result.length > 0 ? result[0] : undefined;
		} else {
			return undefined;
		}
	}

	override getChildren(uri: string): string[] {
		if (this.context) {
			let options = { includeReferencedClasses: this.showReferenced };
			let result = mentor.ontology.getSubClasses(this.context.graphs, uri, options).sort();

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
			return mentor.ontology.getClasses(this.context.graphs, { includeReferencedClasses: false }).length;
		} else {
			return 0;
		}
	}
}