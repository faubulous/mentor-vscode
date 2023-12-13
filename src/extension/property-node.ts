import * as vscode from 'vscode';
import { PropertyRepository, xsd } from '@faubulous/mentor-rdf';
import { ResourceNode } from './resource-node';

export class PropertyNode extends ResourceNode {
	contextValue = 'property';

	rangeType: 'class' | 'literal' = 'class';

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

	override getColor() {
		return new vscode.ThemeColor(`mentor.color.${this.rangeType}`);
	}

	override getIcon(): vscode.ThemeIcon {
		let icon = 'arrow-right';

		const range = this.repository.getRange(this.uri);

		switch (range) {
			case xsd.date.id:
			case xsd.dateTime.id: {
				this.rangeType = 'literal';
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
				this.rangeType = 'literal';
				icon = 'symbol-number';
				break;
			}
			case xsd.boolean.id: {
				this.rangeType = 'literal';
				icon = 'symbol-boolean';
				break;
			}
			case xsd.string.id: {
				this.rangeType = 'literal';
				icon = 'symbol-text';
				break;
			}
			case xsd.base64Binary.id: {
				this.rangeType = 'literal';
				icon = 'file-binary';
				break;
			}
			default:
				this.rangeType = 'class';
				break;
		}

		return new vscode.ThemeIcon(icon, this.getColor());
	}
}