import * as vscode from 'vscode';
import { ResourceRepository } from '@faubulous/mentor-rdf';
import { DocumentContext } from '../document-context';

export class ResourceNode<T extends ResourceRepository> extends vscode.TreeItem {
	contextValue: string = 'resource';

	command: vscode.Command | undefined;

	constructor(
		protected readonly context: DocumentContext<T>,
		public readonly uri: string
	) {
		super('');

		this.iconPath = this.getIcon();
		this.label = this.getLabel();
		this.tooltip = this.getTooltip();

		this.command = {
			command: 'mentor.action.selectResource',
			title: '',
			arguments: [uri]
		};
	}

	protected getLabel(): vscode.TreeItemLabel {
		let label: string;

		const n = this.uri.lastIndexOf('#');

		if (n > -1) {
			label = this.uri.substring(n + 1);
		} else {
			label = this.uri.substring(this.uri.lastIndexOf('/') + 1);
		}

		return {
			label: label,
			highlights: this.uri.length > 1 ? [[this.uri.length - 2, this.uri.length - 1]] : void 0
		}
	}

	protected getTooltip(): vscode.MarkdownString | undefined {
		return this.context.getResourceTooltip(this.uri);
	}

	getColor(): vscode.ThemeColor {
		return new vscode.ThemeColor('descriptionForeground');
	}

	getIcon(): vscode.ThemeIcon {
		return new vscode.ThemeIcon('primitive-square', this.getColor());
	}
}