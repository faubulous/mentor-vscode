import * as vscode from 'vscode';
import { DocumentContext } from '../document-context';

export class ResourceNode extends vscode.TreeItem {
	contextValue: string = 'resource';

	command: vscode.Command | undefined;

	constructor(
		protected readonly context: DocumentContext,
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

	getLabel(): vscode.TreeItemLabel {
		let label = this.context.getResourceLabel(this.uri);

		return {
			label: label,
			highlights: this.uri.length > 1 ? [[this.uri.length - 2, this.uri.length - 1]] : void 0
		}
	}

	getTooltip(): vscode.MarkdownString | undefined {
		return this.context.getResourceTooltip(this.uri);
	}

	getColor(): vscode.ThemeColor {
		return new vscode.ThemeColor('descriptionForeground');
	}

	getIcon(): vscode.ThemeIcon {
		return new vscode.ThemeIcon('primitive-square', this.getColor());
	}
}