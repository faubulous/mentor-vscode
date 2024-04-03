import * as vscode from 'vscode';
import * as mentor from '../mentor';
import { DocumentContext } from '../document-context';
import { ResourceNode } from './resource-node';

/**
 * Represents a concept or concept scheme in the vocabulary tree view.
 */
export class ConceptNode extends ResourceNode {
	constructor(
		protected readonly context: DocumentContext,
		id: string,
		collapsibleState?: vscode.TreeItemCollapsibleState
	) {
		super(context, id, collapsibleState);
	}

	override getCollapsibleState(): vscode.TreeItemCollapsibleState {
		return mentor.vocabulary.hasNarrowerConcepts(this.context.graphs, this.uri) ?
			vscode.TreeItemCollapsibleState.Collapsed :
			vscode.TreeItemCollapsibleState.None;
	}

	override getDescription(): string | undefined {
		const n = mentor.vocabulary.getNarrowerConcepts(this.context.graphs, this.uri).length;

		return n > 0 ? n.toString() : undefined;
	}

	override getIcon() {
		let icon = 'rdf-concept';

		if(mentor.vocabulary.isConceptScheme(this.context.graphs, this.uri)) {
			icon = 'rdf-concept-scheme';
		}

		return new vscode.ThemeIcon(icon, this.getIconColor());
	}

	override getIconColor() {
		return new vscode.ThemeColor("mentor.color.concept");
	}
}