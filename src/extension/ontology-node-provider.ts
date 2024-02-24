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

	override getParent(uri: string): string | undefined {
		return undefined;
	}

	override getChildren(uri: string): string[] {
		if (this.context) {
			return mentor.ontology.getOntologies(this.context.graphs).sort();
		} else {
			return [];
		}
	}

	override getTreeItem(uri: string): vscode.TreeItem {
		if (this.context) {
			return new OntologyNode(this.context, uri);
		} else {
			throw new Error('Invalid context.');
		}
	}

	override getTotalItemCount(): number {
		if (this.context) {
			return mentor.ontology.getOntologies(this.context.graphs).length;
		} else {
			return 0;
		}
	}
}