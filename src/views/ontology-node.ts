import * as vscode from 'vscode';
import * as mentor from '../mentor'
import { DocumentContext } from '../document-context';
import { ResourceNode } from './resource-node';

export class OntologyNode extends ResourceNode {
	constructor(
		protected readonly context: DocumentContext,
		id: string
	) {
		super(context, id);

		this.collapsibleState = this.getCollapsibleState();
	}

	getCollapsibleState(): vscode.TreeItemCollapsibleState {
		if (mentor.vocabulary.getClasses(this.context.graphs, { definedBy: this.uri }).length > 0) {
			return vscode.TreeItemCollapsibleState.Collapsed;
		} else if (mentor.vocabulary.getProperties(this.context.graphs, { definedBy: this.uri }).length > 0) {
			return vscode.TreeItemCollapsibleState.Collapsed;
		} else {
			return vscode.TreeItemCollapsibleState.None;
		}
	}

	override getIcon(): vscode.ThemeIcon {
		return new vscode.ThemeIcon('rdf-ontology', this.getIconColor());
	}

	override getDescription(): string | undefined {
		return mentor.vocabulary.getOntologyVersionInfo(this.context.graphs, this.uri);
	}

	override getIconColor() {
		return undefined;
	}
}