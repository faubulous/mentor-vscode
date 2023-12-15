import * as vscode from 'vscode';
import { Quad, NamedNode } from 'n3';
import { PropertyRepository, xsd, rdf, owl } from '@faubulous/mentor-rdf';
import { ResourceNode } from './resource-node';

export class PropertyNode extends ResourceNode {
	contextValue = 'property';

	propertyType: 'objectProperty' | 'dataProperty' | 'annotationProperty' = 'objectProperty';

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
		return new vscode.ThemeColor(`mentor.color.${this.propertyType}`);
	}

	override getIcon(): vscode.ThemeIcon {
		let icon = 'arrow-right';

		const range = this.repository.getRange(this.uri);

		switch (range) {
			case xsd.date.id:
			case xsd.dateTime.id: {
				this.propertyType = 'dataProperty';
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
			case xsd.nonNegativeInteger.id:
			case xsd.nonPositiveInteger.id:
			case xsd.negativeInteger.id:
			case xsd.positiveInteger.id:
			case xsd.long.id:
			case xsd.unsignedInt.id:
			case xsd.unsignedShort.id:
			case xsd.unsingedLong.id:
			case xsd.usignedByte.id: {
				this.propertyType = 'dataProperty';
				icon = 'symbol-number';
				break;
			}
			case xsd.boolean.id: {
				this.propertyType = 'dataProperty';
				icon = 'symbol-boolean';
				break;
			}
			case xsd.string.id: {
				this.propertyType = 'dataProperty';
				icon = 'symbol-text';
				break;
			}
			case xsd.base64Binary.id: {
				this.propertyType = 'dataProperty';
				icon = 'file-binary';
				break;
			}
			default: {
				this.propertyType = 'objectProperty';
				break;
			}
		}

		const s = new NamedNode(this.uri);
		const p = new NamedNode(rdf.type.id);
		const o = new NamedNode(owl.AnnotationProperty.id);

		for (let q of this.repository.store.match(s, p, o)) {
			this.propertyType = 'annotationProperty';
			break;
		}

		return new vscode.ThemeIcon(icon, this.getColor());
	}
}