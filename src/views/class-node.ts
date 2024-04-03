import * as vscode from 'vscode';
import * as mentor from '../mentor';
import { DocumentContext } from '../document-context';
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
		return mentor.vocabulary.hasSubClasses(this.context.graphs, this.uri) ?
			vscode.TreeItemCollapsibleState.Collapsed :
			vscode.TreeItemCollapsibleState.None;
	}

	override getDescription(): string | undefined {
		let result = "";

		if (mentor.vocabulary.hasEquivalentClass(this.context.graphs, this.uri)) {
			result += "≡";
		}

		// if (mentor.ontology.isIntersectionOfClasses(this.context.graphs, this.uri)) {
		// 	result += "⋂";
		// } else if (mentor.ontology.isUnionOfClasses(this.context.graphs, this.uri)) {
		// 	result += "⋃";
		// } else if (mentor.ontology.hasEquivalentClass(this.context.graphs, this.uri)) {
		// 	result += "≡";
		// }

		return result;
	}

	override getIcon() {
		let icon = 'rdf-class';

		if (!mentor.vocabulary.hasSubject(this.context.graphs, this.uri)) {
			icon += '-ref';
		}

		if (mentor.vocabulary.hasIndividuals(this.context.graphs, this.uri)) {
			icon += "-i";
		}

		return new vscode.ThemeIcon(icon, this.getIconColor());
	}

	override getIconColor() {
		return new vscode.ThemeColor("mentor.color.class");
	}
}