import * as vscode from "vscode";
import * as mentor from "../../mentor";
import { NamedNode } from 'n3';
import { xsd, rdf, rdfs, owl, RDF, DefinitionQueryOptions } from '@faubulous/mentor-rdf';
import { ResourceNode } from "./resource-node";
import { DocumentContext } from "../../document-context";

export class PropertyNode extends ResourceNode {
	contextType = RDF.Property;

	propertyType: 'objectProperty' | 'dataProperty' | 'annotationProperty' = 'objectProperty';

	constructor(context: DocumentContext, id: string, uri: string | undefined, options?: DefinitionQueryOptions, contextValue = "property") {
		super(context, id, uri, options);

		this.contextValue = contextValue;
	}	

	override getIcon() {
		if (!this.uri) {
			return undefined;
		}

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
				label: this.context.getResourceLabel(this.uri)
			}
		}

	}

	override getDescription(): string {
		let result = "";

		if (!this.uri) {
			const properties = mentor.vocabulary.getProperties(this.context.graphs, this.options);
			
			result += properties.length.toString();
		}

		return result;
	}

	override getCollapsibleState(): vscode.TreeItemCollapsibleState {		
		if (mentor.vocabulary.getSubProperties(this.context.graphs, this.uri, this.options).length > 0) {
			return vscode.TreeItemCollapsibleState.Collapsed;
		} else {
			return vscode.TreeItemCollapsibleState.None;
		}
	}
}