import * as vscode from 'vscode';
import * as mentor from '../mentor';
import { DocumentContext } from '../languages/document-context';
import { ResourceNode } from './resource-node';

/**
 * Represents a class in the ontology tree view.
 */
export class ClassNode extends ResourceNode {
	constructor(
		protected readonly context: DocumentContext,
		id: string,
		collapsibleState?: vscode.TreeItemCollapsibleState
	) {
		super(context, id, collapsibleState);
	}

	override getCollapsibleState(): vscode.TreeItemCollapsibleState {
		return mentor.ontology.hasSubClasses(this.context.graphs, this.uri) ?
			vscode.TreeItemCollapsibleState.Collapsed :
			vscode.TreeItemCollapsibleState.None;
	}

	override getDescription(): string | undefined {
		// Todo:
		// - Intersections (∩)
		// - Unions (∪)

		return mentor.ontology.hasEquivalentClass(this.context.graphs, this.uri) ? "≡" : undefined;
	}

	override getIcon() {
		let icon = 'rdf-class';

		if (!mentor.ontology.hasSubject(this.context.graphs, this.uri)) {
			icon += '-ref';
		}

		return new vscode.ThemeIcon(icon, this.getIconColor());
	}

	override getIconColor() {
		return new vscode.ThemeColor("mentor.color.class");
	}
}