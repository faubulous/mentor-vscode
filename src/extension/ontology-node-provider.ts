import * as vscode from 'vscode';
import * as mentor from '../mentor';
import { ResourceNodeProvider } from './resource-node-provider';
import { OntologyNode } from './ontology-node';

/**
 * A tree node provider for OWL ontology headers.
 */
export class OntologyNodeProvider extends ResourceNodeProvider {
	id = 'ontology';

	override getTitle(): string {
		return "Ontologies";
	}

	override getParent(id: string): string | undefined {
		return undefined;
	}

	override getChildren(id: string): string[] {
		if (this.context) {
			const result = mentor.ontology.getOntologies(this.context.graphs);

			return this.sortByLabel(result).map(uri => this.getId(uri));
		} else {
			return [];
		}
	}

	override getTreeItem(id: string): vscode.TreeItem {
		return new OntologyNode(this.context!, id);
	}

	override getTotalItemCount(): number {
		if (this.context) {
			return mentor.ontology.getOntologies(this.context.graphs).length;
		} else {
			return 0;
		}
	}
}