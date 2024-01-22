import * as vscode from 'vscode';
import { IndividualRepository } from '@faubulous/mentor-rdf';
import { ResourceNode } from './resource-node';

export class IndividualNode extends ResourceNode {
	contextValue = 'individual';

	type: 'individual' | 'class' = 'individual';

	constructor(
		protected readonly repository: IndividualRepository,
		public readonly uri: string
	) {
		super(repository, uri);

		this.collapsibleState = vscode.TreeItemCollapsibleState.None;

		this.command = {
			command: 'mentor.command.goToDefinition',
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