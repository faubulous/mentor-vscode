import * as vscode from "vscode";
import { container } from 'tsyringe';
import { VocabularyRepository } from "@faubulous/mentor-rdf";
import { ServiceToken } from '@src/services/tokens';
import { DefinitionTreeNode } from "../definition-tree-node";
import { GroupContainerNode } from "./group-container-node";
import { ClassesNode } from "./classes/classes-node";
import { PropertiesNode } from "./properties/properties-node";
import { IndividualsNode } from "./individuals/individuals-node";
import { CollectionsNode } from "./collections/collections-node";
import { ConceptsNode } from "./concepts/concepts-node";
import { ShapesNode } from "./shapes/shapes-node";
import { RulesNode } from "./rules/rules-node";
import { ValidatorsNode } from "./validators/validators-node";

/**
 * Node of a ontology header in the definition tree.
 */
export class OntologyNode extends GroupContainerNode {
	private get vocabulary() {
		return container.resolve<VocabularyRepository>(ServiceToken.VocabularyRepository);
	}

	isReferenced = false;

	override getLabel(): vscode.TreeItemLabel {
		if (this.uri === 'mentor:unknown') {
			return { label: 'Unknown' };
		} else {
			return super.getLabel();
		}
	}

	override getIcon() {
		return new vscode.ThemeIcon('rdf-ontology', this.getIconColor());
	}

	override getIconColor() {
		return new vscode.ThemeColor("mentor.color.class");
	}

	override getDescription(): string {
		let result = super.getDescription();

		if (this.uri) {
			const version = this.vocabulary.getOntologyVersionInfo(this.getDocumentGraphs(), this.uri);

			if (version) {
				result += " Version " + version;
			}
		}

		return result;
	}

	override getTooltip(): vscode.MarkdownString | undefined {
		if (this.uri === 'mentor:unknown') {
			return new vscode.MarkdownString('Definitions that are not associated with an ontology in this document, either via `rdfs:isDefinedBy` or via a shared namespace IRI.');
		} else {
			return super.getTooltip();
		}
	}

	/**
	 * Create the group nodes that may be listed below this node, whether they have children or not.
	 * @returns The group nodes in the order they are displayed.
	 */
	protected override createGroupNodes(): DefinitionTreeNode[] {
		return [
			this.createChildNode(ClassesNode, 'mentor:classes'),
			this.createChildNode(PropertiesNode, 'mentor:properties'),
			this.createChildNode(IndividualsNode, 'mentor:individuals'),
			// Note: Concepts that are displayed below a concept scheme are listed under that scheme,
			// which is a root node of the tree, so only the remaining concepts are listed here.
			this.createChildNode(ConceptsNode, 'mentor:concepts', { inScheme: null }),
			// Note: Collections that are associated with a concept scheme are listed under that scheme,
			// which is a root node of the tree, so only the remaining collections are listed here.
			this.createChildNode(CollectionsNode, 'mentor:collections', { inScheme: null }),
			this.createChildNode(ShapesNode, 'mentor:shapes', this.getQueryOptions({ includeBlankNodes: true })),
			this.createChildNode(RulesNode, 'mentor:rules', this.getQueryOptions({ includeBlankNodes: true })),
			this.createChildNode(ValidatorsNode, 'mentor:validators', this.getQueryOptions({ includeBlankNodes: true }))
		];
	}
}