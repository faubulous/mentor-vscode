import * as vscode from "vscode";
import { mentor } from "../../mentor";
import { xsd, rdfs, RDF, DefinitionQueryOptions } from '@faubulous/mentor-rdf';
import { ResourceNode } from "./resource-node";
import { DocumentContext } from "../../languages";
import { DefinitionTreeNode, sortByLabel } from "../definition-tree-node";
import { ClassNode } from "./class-node";

/**
 * Node of a property in the definition tree.
 */
export class PropertyNode extends ResourceNode {
	contextType = RDF.Property;

	initialCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed;

	defaultLabel = "Properties";

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

	override getDescription(): string {
		let result = super.getDescription();

		if (!this.uri) {
			const properties = mentor.vocabulary.getProperties(this.document.graphs, this.options);

			result += " " + properties.length.toString();
		}

		return result;
	}

	override getChildren(): DefinitionTreeNode[] {
		if (!this.document) {
			return [];
		}

		const result = [];

		if (this.contextValue === "properties" && this.showPropertyTypes) {
			const types = mentor.vocabulary.getPropertyTypes(this.document.graphs, this.options);

			for (let type of types) {
				const n = new ClassNode(this.document, this.id + `/<${type}>`, type, this.options);
				n.contextType = RDF.Property;

				result.push(n);
			}
		} else if (this instanceof ClassNode) { // TODO: This is not possible.
			throw new Error("This should not be possible.");
			
			// Note: We only want to return the asserted properties here.
			let properties = mentor.vocabulary.getRootPropertiesOfType(this.document.graphs, this.uri!, this.options);

			for (let p of properties) {
				result.push(new PropertyNode(this.document, this.id + `/<${p}>`, p, this.options));
			}
		} else {
			const properties = mentor.vocabulary.getSubProperties(this.document.graphs, this.uri, this.options);

			for (let p of properties) {
				result.push(new PropertyNode(this.document, this.id + `/<${p}>`, p, this.options));
			}
		}

		return sortByLabel(result);
	}
}