import * as vscode from 'vscode';
import * as mentor from '../mentor'
import { DocumentContext } from '../languages/document-context';
import { ResourceNode } from './resource-node';

export class OntologyNode extends ResourceNode {
	contextValue = 'ontology';

	constructor(
		protected readonly context: DocumentContext,
		public readonly uri: string
	) {
		super(context, uri);
	}

	override getIcon(): vscode.ThemeIcon {
		return new vscode.ThemeIcon('rdf-ontology', this.getIconColor());
	}

	override getDescription(): string | undefined {
		return mentor.ontology.getOntologyVersionInfo(this.context.graphs, this.uri);
	}

	override getIconColor() {
		return undefined;
	}
}