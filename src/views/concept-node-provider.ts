import * as vscode from 'vscode';
import * as mentor from '../mentor';
import { ConceptNode } from './concept-node';
import { ResourceNodeProvider } from './resource-node-provider';

/**
 * A tree node provider for RDFS or OWL classes.
 */
export class ConceptNodeProvider extends ResourceNodeProvider {
	id = "concept";

	override getTitle(): string {
		return "Concepts";
	}

	override getParent(id: string): string | undefined {
		if (this.context && id) {
			const uri = this.getUri(id)!;
			const result = mentor.vocabulary.getBroaderConcepts(this.context.graphs, uri).sort().slice(0, 1);

			return result.length > 0 ? result[0] : undefined;
		} else {
			return undefined;
		}
	}

	override getChildren(id: string): string[] {
		if (this.context) {
			const uri = this.getUri(id);
			const result = mentor.vocabulary.getNarrowerConcepts(this.context.graphs, uri);

			return this.sortByLabel(result).map(u => this.getId(u, uri));
		} else {
			return [];
		}
	}

	override getTreeItem(id: string): vscode.TreeItem {
		return new ConceptNode(this.context!, id);
	}

	override getTotalItemCount(): number {
		if (this.context) {
			return mentor.vocabulary.getConcepts(this.context.graphs).length;
		} else {
			return 0;
		}
	}
}