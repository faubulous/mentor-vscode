import * as vscode from "vscode";
import { container } from 'tsyringe';
import { VocabularyRepository } from "@faubulous/mentor-rdf";
import { ServiceToken } from '@src/services/tokens';
import { DefinitionTreeNode } from "../definition-tree-node";
import { ClassesNode } from "./classes/classes-node";
import { PropertiesNode } from "./properties/properties-node";
import { IndividualsNode } from "./individuals/individuals-node";
import { ShapesNode } from "./shapes/shapes-node";
import { RulesNode } from "./rules/rules-node";
import { ValidatorsNode } from "./validators/validators-node";

/**
 * Node of a ontology header in the definition tree.
 */
export class OntologyNode extends DefinitionTreeNode {
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
		// return undefined;
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
				result += " " + version;
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

	override getChildren(): DefinitionTreeNode[] {
		const result = [];

		const classes = this.createChildNode(ClassesNode, 'mentor:classes');

		if (classes.hasChildren()) {
			result.push(classes);
		}

		const properties = this.createChildNode(PropertiesNode, 'mentor:properties');

		if (properties.hasChildren()) {
			result.push(properties);
		}

		const individuals = this.createChildNode(IndividualsNode, 'mentor:individuals');

		if (individuals.hasChildren()) {
			result.push(individuals);
		}

		const shapes = this.createChildNode(ShapesNode, 'mentor:shapes', this.getQueryOptions({ includeBlankNodes: true }));

		if (shapes.hasChildren()) {
			result.push(shapes);
		}

		const rules = this.createChildNode(RulesNode, 'mentor:rules', this.getQueryOptions({ includeBlankNodes: true }));

		if (rules.hasChildren()) {
			result.push(rules);
		}

		const validators = this.createChildNode(ValidatorsNode, 'mentor:validators', this.getQueryOptions({ includeBlankNodes: true }));

		if (validators.hasChildren()) {
			result.push(validators);
		}

		return result;
	}

	override resolveNodeForUri(iri: string): DefinitionTreeNode | undefined {
		for (const child of this.getChildren()) {
			const found = child.resolveNodeForUri(iri);

			if (found) {
				return found;
			}
		}

		return undefined;
	}
}