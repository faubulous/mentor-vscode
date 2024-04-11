import * as vscode from 'vscode';
import * as mentor from '../mentor';
import { NamedNode } from 'n3';
import { xsd, rdf, rdfs, owl } from '@faubulous/mentor-rdf';
import { ResourceNode } from './resource-node';
import { DocumentContext } from '../document-context';

export class PropertyNode extends ResourceNode {
	propertyType: 'objectProperty' | 'dataProperty' | 'annotationProperty' = 'objectProperty';

	constructor(
		protected readonly context: DocumentContext,
		id: string
	) {
		super(context, id);

		this.collapsibleState = mentor.vocabulary.hasSubProperties(this.context.graphs, this.uri) ?
			vscode.TreeItemCollapsibleState.Collapsed :
			vscode.TreeItemCollapsibleState.None;
	}

	override getIconColor() {
		return new vscode.ThemeColor(`mentor.color.${this.propertyType}`);
	}

	override getIcon(): vscode.ThemeIcon {
		let icon = 'arrow-right';

		// 1. Determine the property type.
		this.propertyType = 'objectProperty';

		let s = new NamedNode(this.uri);
		let p = new NamedNode(rdf.type.id);
		let o = new NamedNode(owl.DatatypeProperty.id);

		for (let q of mentor.vocabulary.store.match(this.context.graphs, s, p, o)) {
			this.propertyType = 'dataProperty';
			icon = 'symbol-text';
			break;
		}

		// 2. Derive the icon from the property type.
		const range = mentor.vocabulary.getRange(this.context.graphs, this.uri);

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
			case rdfs.Literal.id:
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
			case xsd.anyURI.id: {
				icon = 'arrow-right';
				break;
			}
		}

		return new vscode.ThemeIcon(icon, this.getIconColor());
	}
}