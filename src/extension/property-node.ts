import * as vscode from 'vscode';
import { PropertyRepository, xsd } from '@faubulous/mentor-rdf';
import { ResourceNode } from './resource-node';

export class PropertyNode extends ResourceNode {
	contextValue = 'property';

	constructor(
		protected readonly repository: PropertyRepository,
		public readonly uri: string
	) {
		super(repository, uri);

		this.collapsibleState = this.repository.hasSubProperties(uri) ?
			vscode.TreeItemCollapsibleState.Collapsed :
			vscode.TreeItemCollapsibleState.None;

		this.command = {
			command: 'mentor.command.selectProperty',
			title: '',
			arguments: [uri]
		};
	}

	override getIcon(): vscode.ThemeIcon {
		let icon = 'arrow-right';

		const range = this.repository.getRange(this.uri);

		switch (range) {
			case xsd.date.id:
			case xsd.dateTime.id: {
				icon = 'calendar';
				break;
			}
			case xsd.byte.id:
			case xsd.decimal.id:
			case xsd.double.id:
			case xsd.float.id:
			case xsd.int.id:
			case xsd.integer.id:
			case xsd.short.id:
			case xsd.unsignedInt.id:
			case xsd.unsignedShort.id:
			case xsd.unsingedLong.id:
			case xsd.usignedByte.id: {
				icon = 'symbol-number';
				break;
			}
			case xsd.boolean.id: {
				icon = 'symbol-boolean';
				break;
			}
			case xsd.string.id: {
				icon = 'symbol-text';
				break;
			}
			case xsd.base64Binary.id: {
				icon = 'file-binary';
				break;
			}
		}

		return new vscode.ThemeIcon(icon, this.getColor());
	}
}