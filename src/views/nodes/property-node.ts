import * as vscode from "vscode";
import { xsd, rdfs } from '@faubulous/mentor-rdf';
import { mentor } from "../../mentor";
import { DefinitionTreeNode, sortByLabel } from "../definition-tree-node";

/**
 * Node of a property in the definition tree.
 */
export class PropertyNode extends DefinitionTreeNode {

	propertyType: 'objectProperty' | 'dataProperty' | 'annotationProperty' = 'objectProperty';

	getRange(propertyUri?: string): string {
		let rangeUri: string | undefined;

		if (propertyUri) {
			rangeUri = mentor.vocabulary.getRange(this.graphs, propertyUri);

			if (!rangeUri) {
				rangeUri = mentor.vocabulary.getDatatype(this.graphs, propertyUri);
			}
		}

		return rangeUri ?? rdfs.Resource.id;
	}

	getPropertyType(rangeUri?: string) {
		switch (rangeUri) {
			case rdfs.Literal.id:
			case xsd.base64Binary.id:
			case xsd.boolean.id:
			case xsd.byte.id:
			case xsd.date.id:
			case xsd.dateTime.id:
			case xsd.decimal.id:
			case xsd.double.id:
			case xsd.float.id:
			case xsd.int.id:
			case xsd.integer.id:
			case xsd.long.id:
			case xsd.negativeInteger.id:
			case xsd.nonNegativeInteger.id:
			case xsd.nonPositiveInteger.id:
			case xsd.positiveInteger.id:
			case xsd.short.id:
			case xsd.string.id:
			case xsd.unsignedInt.id:
			case xsd.unsignedShort.id:
			case xsd.unsingedLong.id:
			case xsd.usignedByte.id: {
				return 'dataProperty';
			}
			default: {
				return 'objectProperty';
			}
		}
	}

	getIconColorFromRange(rangeIri?: string) {
		return new vscode.ThemeColor('mentor.color.' + this.getPropertyType(rangeIri));
	}

	getIconNameFromRange(rangeIri?: string) {
		switch (rangeIri) {
			case xsd.date.id:
			case xsd.dateTime.id: {
				return 'calendar';
			}
			case xsd.boolean.id: {
				return 'symbol-boolean';
			}
			case xsd.base64Binary.id: {
				return 'file-binary';
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
				return 'symbol-number';
			}
			case xsd.string.id:
			case rdfs.Literal.id: {
				return 'symbol-text';
			}
			default: {
				if (this.uri && mentor.vocabulary.hasSubject(this.graphs, this.uri)) {
					return 'rdf-object-property';
				} else {
					return 'rdf-object-property-ref';
				}
			}
		}
	}

	override getIconColor() {
		const rangeIri = this.getRange(this.uri);

		return this.getIconColorFromRange(rangeIri);
	}

	override getIcon() {
		const rangeIri = this.getRange(this.uri);

		const iconName = this.getIconNameFromRange(rangeIri);
		const iconColor = this.getIconColorFromRange(rangeIri);

		return new vscode.ThemeIcon(iconName, iconColor);
	}

	override getChildren(): DefinitionTreeNode[] {
		const result = [];
		const properties = mentor.vocabulary.getSubProperties(this.graphs, this.uri, this.options);

		for (let p of properties) {
			result.push(new PropertyNode(this.document, this.id + `/<${p}>`, p, this.options));
		}

		return sortByLabel(result);
	}
}