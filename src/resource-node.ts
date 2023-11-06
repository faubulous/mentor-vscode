import * as vscode from 'vscode';
import * as n3 from 'n3';
import { ResourceRepository, skos, rdfs } from '@faubulous/mentor-rdf';
import { getNamespaceUri, toJsonId } from './utilities';

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

	protected getTooltip(): vscode.MarkdownString {
		let result = '';

		if (this.repository) {
			const s = n3.DataFactory.namedNode(this.uri);

			for (let d of this.repository.store.match(s, skos.definition, null, null)) {
				result += d.object.value;
				break;
			}

			if (!result) {
				for (let d of this.repository.store.match(s, rdfs.comment, null, null)) {
					result += d.object.value;
					break;
				}
			}
		}

		if (result) {
			result += '\n\n';
		}

		result += this.uri;

		return new vscode.MarkdownString(result, true);
	}

	getColor(): vscode.ThemeColor {
		const id = toJsonId(getNamespaceUri(this.uri));

		return new vscode.ThemeColor('mentor.color.' + id);
	}

	getIcon(): vscode.ThemeIcon {
		return new vscode.ThemeIcon('primitive-square', this.getColor());
	}
}