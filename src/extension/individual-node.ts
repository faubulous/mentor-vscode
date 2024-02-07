import * as vscode from 'vscode';
import { DocumentContext } from '../languages/document-context';
import { ResourceNode } from './resource-node';

export class IndividualNode extends ResourceNode {
	contextValue = 'individual';

	type: 'individual' | 'class' = 'individual';

	constructor(
		protected readonly context: DocumentContext,
		public readonly uri: string
	) {
		super(context, uri);

		this.collapsibleState = vscode.TreeItemCollapsibleState.None;

		this.command = {
			command: 'mentor.action.goToDefinition',
			title: '',
			arguments: [uri]
		};
	}

	override getColor() {
		return new vscode.ThemeColor("mentor.color.individual");
	}

	override getIcon(): vscode.ThemeIcon {
		return new vscode.ThemeIcon('rdf-individual', this.getColor());
	}
}