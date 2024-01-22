import * as vscode from 'vscode';
import * as n3 from 'n3';
import { mentor } from '../mentor';
import { ResourceRepository, skos, rdfs } from '@faubulous/mentor-rdf';

export class ResourceNode extends vscode.TreeItem {
	contextValue: string = 'resource';

	command: vscode.Command | undefined;

	constructor(
		protected readonly repository: ResourceRepository,
		public readonly uri: string
	) {
		super('');

		this.iconPath = this.getIcon();
		this.label = this.getLabel();
		this.tooltip = this.getTooltip();

		this.command = {
			command: 'mentor.command.selectResource',
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
		return mentor.activeContext?.getResourceTooltip(this.uri);
	}

	getColor(): vscode.ThemeColor {
		return new vscode.ThemeColor('descriptionForeground');
	}

	getIcon(): vscode.ThemeIcon {
		return new vscode.ThemeIcon('primitive-square', this.getColor());
	}
}