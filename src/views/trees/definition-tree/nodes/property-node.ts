import * as vscode from "vscode";
import { xsd, rdf, rdfs } from '@faubulous/mentor-rdf';
import { mentor } from "@src/mentor";
import { TreeNode, sortByLabel } from "@src/views/trees/tree-node";
import { DefinitionTreeNode } from "../definition-tree-node";

/**
 * Node of a property in the definition tree.
 */
export class PropertyNode extends DefinitionTreeNode {
	/**
	 * Type of the property.
	 */
	propertyType: 'objectProperty' | 'dataProperty' | 'annotationProperty' = 'objectProperty';

	getContextValue(): string {
		let result = super.getContextValue();

		if (mentor.vocabulary.hasShapes(this.document.graphs, this.uri, this.getQueryOptions({ definedBy: undefined }))) {
			result += " shape-target";
		}

		return result;
	}

	getRange(propertyUri?: string): string {
		let rangeUri: string | undefined;

		if (propertyUri) {
			rangeUri = mentor.vocabulary.getRange(this.getDocumentGraphs(), propertyUri);

			if (!rangeUri) {
				rangeUri = mentor.vocabulary.getDatatype(this.getDocumentGraphs(), propertyUri);
			}
		}

		return rangeUri ?? rdfs.Resource.id;
	}

	getPropertyType(rangeUri?: string) {
		switch (rangeUri) {
			case rdf.langString.id:
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
			case rdf.langString.id:
			case rdfs.Literal.id: {
				return 'symbol-text';
			}
			default: {
				return 'rdf-object-property';
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

	override getChildren(): TreeNode[] {
		const result = [];
		const properties = mentor.vocabulary.getSubProperties(this.getDocumentGraphs(), this.uri, this.getQueryOptions());

		for (let p of properties) {
			result.push(this.createChildNode(PropertyNode, p));
		}

		return sortByLabel(result);
	}
}