import * as vscode from 'vscode';
import { ClassRepository } from '@faubulous/mentor-rdf';
import { ResourceNode } from './resource-node';

export class ClassNode extends ResourceNode {
	contextValue = 'class';

	constructor(
		protected readonly repository: ClassRepository,
		public readonly uri: string
	) {
		super(repository, uri);

		this.collapsibleState = this.repository.hasSubClasses(uri) ?
			vscode.TreeItemCollapsibleState.Collapsed :
			vscode.TreeItemCollapsibleState.None;
			
		this.command = {
			command: 'mentor.classExplorer.command.selectEntry',
			title: '',
			arguments: [uri]
		};
	}

	override getIcon() {
		let icon = 'rdf-class';

		if (!this.repository.hasSubject(this.uri)) {
			icon += '-ref';
		}

		if (this.repository.hasEquivalentClass(this.uri)) {
			icon += '-eq';
		}

		return new vscode.ThemeIcon(icon, this.getColor());
	}
}