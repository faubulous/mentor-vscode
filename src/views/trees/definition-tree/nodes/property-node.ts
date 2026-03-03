import * as vscode from "vscode";
import { XSD, RDF, RDFS } from '@faubulous/mentor-rdf';
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

		return rangeUri ?? RDFS.Resource;
	}

	getPropertyType(rangeUri?: string) {
		switch (rangeUri) {
			case RDF.langString:
			case RDFS.Literal:
			case XSD.base64Binary:
			case XSD.boolean:
			case XSD.byte:
			case XSD.date:
			case XSD.dateTime:
			case XSD.decimal:
			case XSD.double:
			case XSD.float:
			case XSD.int:
			case XSD.integer:
			case XSD.long:
			case XSD.negativeInteger:
			case XSD.nonNegativeInteger:
			case XSD.nonPositiveInteger:
			case XSD.positiveInteger:
			case XSD.short:
			case XSD.string:
			case XSD.unsignedInt:
			case XSD.unsignedShort:
			case XSD.unsingedLong:
			case XSD.usignedByte: {
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
			case XSD.date:
			case XSD.dateTime: {
				return 'calendar';
			}
			case XSD.boolean: {
				return 'symbol-boolean';
			}
			case XSD.base64Binary: {
				return 'file-binary';
			}
			case XSD.byte:
			case XSD.decimal:
			case XSD.double:
			case XSD.float:
			case XSD.int:
			case XSD.integer:
			case XSD.short:
			case XSD.nonNegativeInteger:
			case XSD.nonPositiveInteger:
			case XSD.negativeInteger:
			case XSD.positiveInteger:
			case XSD.long:
			case XSD.unsignedInt:
			case XSD.unsignedShort:
			case XSD.unsingedLong:
			case XSD.usignedByte: {
				return 'symbol-number';
			}
			case XSD.string:
			case RDF.langString:
			case RDFS.Literal: {
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