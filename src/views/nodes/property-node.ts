import * as vscode from "vscode";
import { mentor } from "../../mentor";
import { xsd, rdfs, RDF, DefinitionQueryOptions } from '@faubulous/mentor-rdf';
import { ResourceNode } from "./resource-node";
import { DocumentContext } from "../../languages";

export class PropertyNode extends ResourceNode {
	contextType = RDF.Property;

	initialCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed;

	propertyType: 'objectProperty' | 'dataProperty' | 'annotationProperty' = 'objectProperty';

	rangeUri?: string | undefined;

	constructor(context: DocumentContext, id: string, uri: string | undefined, options?: DefinitionQueryOptions) {
		super(context, id, uri, options);

		this.rangeUri = PropertyNode.getRangeUri(this.document.graphs, this.uri);
	}

	static getRangeUri(graphUris: string | string[] | undefined, uri?: string) {
		if (uri) {
			let range = mentor.vocabulary.getRange(graphUris, uri);

			if (range) {
				return range;
			} else {
				return mentor.vocabulary.getDatatype(graphUris, uri);
			}
		}
	}

	static getPropertyType(rangeUri?: string) {
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

	static getIcon(graphUris: string | string[] | undefined, propertyUri?: string, rangeUri?: string) {
		if (propertyUri) {
			const iconColor = PropertyNode.getIconColor(graphUris, propertyUri, rangeUri);

			switch (rangeUri) {
				// Dates
				case xsd.date.id:
				case xsd.dateTime.id: {
					return new vscode.ThemeIcon('calendar', iconColor);
				}
				// Boolean
				case xsd.boolean.id: {
					return new vscode.ThemeIcon('symbol-boolean', iconColor);
				}
				// Base64
				case xsd.base64Binary.id: {
					return new vscode.ThemeIcon('file-binary', iconColor);
				}
				// Numbers
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
					return new vscode.ThemeIcon('symbol-number', iconColor);
				}
				// Text
				case rdfs.Literal.id:
				case xsd.string.id: {
					return new vscode.ThemeIcon('symbol-text', iconColor);
				}
				// Resources
				default: {
					if (mentor.vocabulary.hasSubject(graphUris, propertyUri)) {
						return new vscode.ThemeIcon('rdf-object-property', iconColor);
					} else {
						return new vscode.ThemeIcon('rdf-object-property-ref', iconColor);
					}
				}
			}
		}
	}

	static getIconColor(graphUris: string | string[] | undefined, propertyUri?: string, rangeUri?: string) {
		let color = 'mentor.color.' + PropertyNode.getPropertyType(rangeUri);
		
		return new vscode.ThemeColor(color);
	}

	override getIcon() {
		return PropertyNode.getIcon(this.document.graphs, this.uri, this.rangeUri);
	}

	override getIconColor() {
		return PropertyNode.getIconColor(this.document.graphs, this.uri, this.rangeUri!);
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

			result += " " + properties.length.toString();
		}

		return result;
	}
}