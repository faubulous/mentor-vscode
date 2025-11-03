import * as vscode from "vscode";
import { mentor } from "@src/mentor";
import { DefinitionTreeNode } from "../definition-tree-node";
import { ClassesNode } from "./classes-node";
import { PropertiesNode } from "./properties-node";
import { IndividualsNode } from "./individuals-node";
import { ShapesNode } from "./shapes-node";
import { RulesNode } from "./rules-node";
import { ValidatorsNode } from "./validators-node";

/**
 * Node of a ontology header in the definition tree.
 */
export class OntologyNode extends DefinitionTreeNode {
	isReferenced = false;

	override getLabel(): vscode.TreeItemLabel {
		if (this.uri === 'mentor:unknown') {
			return { label: 'Unknown' };
		} else {
			return super.getLabel();
		}
	}

	override getIcon() {
		if (this.isReferenced) {
			return new vscode.ThemeIcon('rdf-ontology-ref', this.getIconColor());
		} else {
			return new vscode.ThemeIcon('rdf-ontology', this.getIconColor());
		}
	}

	override getIconColor() {
		return new vscode.ThemeColor("mentor.color.class");
	}

	override getDescription(): string {
		let result = super.getDescription();

		if (this.uri) {
			const version = mentor.vocabulary.getOntologyVersionInfo(this.getDocumentGraphs(), this.uri);

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

		if (classes.getChildren().length > 0) {
			result.push(classes);
		}

		const properties = this.createChildNode(PropertiesNode, 'mentor:properties');

		if (properties.getChildren().length > 0) {
			result.push(properties);
		}

		const individuals = this.createChildNode(IndividualsNode, 'mentor:individuals');

		if (individuals.getChildren().length > 0) {
			result.push(individuals);
		}

		const shapes = this.createChildNode(ShapesNode, 'mentor:shapes', this.getQueryOptions({ includeBlankNodes: true }));

		if (shapes.getChildren().length > 0) {
			result.push(shapes);
		}

		const rules = this.createChildNode(RulesNode, 'mentor:rules', this.getQueryOptions({ includeBlankNodes: true }));

		if (rules.getChildren().length > 0) {
			result.push(rules);
		}

		const validators = this.createChildNode(ValidatorsNode, 'mentor:validators', this.getQueryOptions({ includeBlankNodes: true }));

		if (validators.getChildren().length > 0) {
			result.push(validators);
		}

		return result;
	}
}