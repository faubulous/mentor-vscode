import * as vscode from "vscode";
import * as mentor from "../../mentor";
import { NamedNode } from 'n3';
import { xsd, rdf, rdfs, owl, RDF, DefinitionQueryOptions } from '@faubulous/mentor-rdf';
import { ResourceNode } from "./resource-node";
import { DocumentContext } from "../../document-context";

export class PropertyNode extends ResourceNode {
	contextType = RDF.Property;

	initialCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed;

	propertyType: 'objectProperty' | 'dataProperty' | 'annotationProperty' = 'objectProperty';
	
	override getIcon() {
		if (!this.uri) {
			return undefined;
		}

		let icon = 'rdf-object-property';

		// 1. Determine the property type.
		this.propertyType = 'objectProperty';

		let s = new NamedNode(this.uri);

		for (let _ of mentor.vocabulary.store.match(this.document.graphs, s, rdf.type, owl.DatatypeProperty)) {
			this.propertyType = 'dataProperty';
			icon = 'symbol-text';
			break;
		}

		// 2. Derive the icon from the property type.
		const range = mentor.vocabulary.getRange(this.document.graphs, this.uri);

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
				icon = 'rdf-object-property';
				break;
			}
		}

		if (!mentor.vocabulary.hasSubject(this.document.graphs, this.uri)) {
			icon = 'rdf-object-property-ref';
		}

		return new vscode.ThemeIcon(icon, this.getIconColor());
	}

	override getIconColor() {
		return new vscode.ThemeColor(`mentor.color.${this.propertyType}`);
	}

	override getLabel(): vscode.TreeItemLabel {
		if (!this.uri) {
			return {
				label: "Properties"
			}
		} else {
			return {
				label: this.document.getResourceLabel(this.uri)
			}
		}

	}

	override getDescription(): string {
		let result = "";

		if (!this.uri) {
			const properties = mentor.vocabulary.getProperties(this.document.graphs, this.options);

			result += properties.length.toString();
		}

		return result;
	}
}