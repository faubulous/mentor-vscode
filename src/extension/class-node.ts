import * as vscode from 'vscode';
import * as mentor from '../mentor';
import { DocumentContext } from '../document-context';
import { ResourceNode } from './resource-node';

export class ClassNode extends ResourceNode {
	contextValue = 'class';

	constructor(
		protected readonly context: DocumentContext,
		public readonly uri: string,
		collapsibleState?: vscode.TreeItemCollapsibleState
	) {
		super(context, uri);

		if (collapsibleState) {
			this.collapsibleState = collapsibleState;
		} else {
			this.collapsibleState = mentor.ontology.hasSubClasses(this.context.graphs, uri) ?
				vscode.TreeItemCollapsibleState.Collapsed :
				vscode.TreeItemCollapsibleState.None;
		}

		this.command = {
			command: 'mentor.action.goToDefinition',
			title: '',
			arguments: [uri]
		};
	}

	override getColor() {
		return new vscode.ThemeColor("mentor.color.class");
	}

	override getIcon() {
		let icon = 'rdf-class';

		if (mentor.ontology.hasEquivalentClass(this.context.graphs, this.uri)) {
			icon += '-eq';
		}
		else if (!mentor.ontology.hasSubject(this.context.graphs, this.uri)) {
			icon += '-ref';
		}

		return new vscode.ThemeIcon(icon, this.getColor());
	}
}