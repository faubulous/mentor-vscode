import * as vscode from 'vscode';
import { DocumentContext } from '../document-context';
import { ResourceNode } from './resource-node';
import { OntologyRepository } from '@faubulous/mentor-rdf';

export class ClassNode extends ResourceNode<OntologyRepository> {
	contextValue = 'class';

	constructor(
		protected readonly context: DocumentContext<OntologyRepository>,
		public readonly uri: string,
		collapsibleState?: vscode.TreeItemCollapsibleState
	) {
		super(context, uri);

		if (collapsibleState) {
			this.collapsibleState = collapsibleState;
		} else {
			this.collapsibleState = this.context.repository.hasSubClasses(this.context.graphs, uri) ?
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

		if (this.context.repository.hasEquivalentClass(this.context.graphs, this.uri)) {
			icon += '-eq';
		}
		else if (!this.context.repository.hasSubject(this.context.graphs, this.uri)) {
			icon += '-ref';
		}

		return new vscode.ThemeIcon(icon, this.getColor());
	}
}