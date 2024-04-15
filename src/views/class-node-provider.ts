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

	override getParent(id: string): string | undefined {
		if (this.context && id) {
			const uri = this.getUri(id)!;
			const result = mentor.vocabulary.getSuperClasses(this.context.graphs, uri).sort().slice(0, 1);

			return result.length > 0 ? result[0] : undefined;
		} else {
			return undefined;
		}
	}

	override getChildren(id: string): string[] {
		if (this.context) {
			const uri = this.getUri(id);
			const result = mentor.vocabulary.getSubClasses(this.context.graphs, uri, { includeReferenced: this.showReferenced });

			return this.sortByLabel(result).map(u => this.getId(u, uri));
		} else {
			return [];
		}
	}

	override getTreeItem(id: string): vscode.TreeItem {
		return new ClassNode(this.context!, id);
	}

	override getTotalItemCount(): number {
		if (this.context) {
			return mentor.vocabulary.getClasses(this.context.graphs, { includeReferenced: false }).length;
		} else {
			return 0;
		}
	}
}