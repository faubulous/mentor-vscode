import * as vscode from 'vscode';
import { ClassRepository } from '@faubulous/mentor-rdf';
import { ResourceNode } from './resource-node';

export class ClassNode extends ResourceNode {
	contextValue = 'class';

	constructor(
		protected readonly repository: ClassRepository,
		public readonly uri: string,
		collapsibleState?: vscode.TreeItemCollapsibleState
	) {
		super(repository, uri);

		if (collapsibleState) {
			this.collapsibleState = collapsibleState;
		} else {
			this.collapsibleState = this.repository.hasSubClasses(uri) ?
				vscode.TreeItemCollapsibleState.Collapsed :
				vscode.TreeItemCollapsibleState.None;
		}

		this.command = {
			command: 'mentor.command.classTree.selectItem',
			title: '',
			arguments: [uri]
		};
	}

	override getColor() {
		return new vscode.ThemeColor("mentor.color.class");
	}

	override getIcon() {
		let icon = 'rdf-class';

		if (this.repository.hasEquivalentClass(this.uri)) {
			icon += '-eq';
		}
		else if (!this.repository.hasSubject(this.uri)) {
			icon += '-ref';
		}

		return new vscode.ThemeIcon(icon, this.getColor());
	}
}