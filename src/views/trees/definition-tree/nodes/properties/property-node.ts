import * as vscode from "vscode";
import { XSD, RDF, RDFS, VocabularyRepository } from '@faubulous/mentor-rdf';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { any, getPropertyTypeFromRange } from '@src/utilities';
import { TreeNode, sortByLabel } from "@src/views/trees/tree-node";
import { DefinitionTreeNode } from "../../definition-tree-node";

/**
 * Node of a property in the definition tree.
 */
export class PropertyNode extends DefinitionTreeNode {
	protected get vocabulary() {
		return container.resolve<VocabularyRepository>(ServiceToken.VocabularyRepository);
	}

	/**
	 * Type of the property.
	 */
	propertyType: 'objectProperty' | 'dataProperty' | 'annotationProperty' = 'objectProperty';

	getContextValue(): string {
		let result = super.getContextValue();

		if (this.vocabulary.hasShapes(this.document.graphs, this.uri, this.getQueryOptions({ definedBy: undefined }))) {
			result += " shape-target";
		}

		return result;
	}

	getRange(propertyUri?: string): string {
		let rangeUri: string | undefined;

		if (propertyUri) {
			rangeUri = this.vocabulary.getRange(this.getDocumentGraphs(), propertyUri);

			if (!rangeUri) {
				rangeUri = this.vocabulary.getDatatype(this.getDocumentGraphs(), propertyUri);
			}
		}

		return rangeUri ?? RDFS.Resource;
	}

	getPropertyType(rangeUri?: string) {
		return getPropertyTypeFromRange(rangeUri);
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
			case XSD.unsignedLong:
			case XSD.unsignedByte: {
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

	/**
	 * Get the IRIs of the sub properties that are listed below this node.
	 * @returns An iterator of property IRIs.
	 */
	private _getSubPropertyIris(): IterableIterator<string> {
		return this.vocabulary.getSubProperties(this.getDocumentGraphs(), this.uri, this.getQueryOptions());
	}

	/**
	 * Indicates whether the property has sub properties, stopping at the first one.
	 * @returns `true` if the node has children, `false` otherwise.
	 */
	override hasChildren(): boolean {
		return any(this._getSubPropertyIris());
	}

	override getChildren(): TreeNode[] {
		const result = [];

		for (const p of this._getSubPropertyIris()) {
			result.push(this.createChildNode(PropertyNode, p));
		}

		return sortByLabel(result);
	}
}