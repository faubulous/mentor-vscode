import * as vscode from "vscode";
import { mentor } from "../../mentor";
import { DefinitionTreeNode } from "../definition-tree-node";
import { ClassGroupNode } from "./class-group-node";
import { PropertyGroupNode } from "./property-group-node";
import { IndividualGroupNode } from "./individual-group-node";
import { ShapeGroupNode } from "./shape-group-node";
import { RuleGroupNode } from "./rule-group-node";
import { ValidatorGroupNode } from "./validator-group-node";

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

		const classes = this.createChildNode(ClassGroupNode, 'mentor:classes');

		if (classes.getChildren().length > 0) {
			result.push(classes);
		}

		const properties = this.createChildNode(PropertyGroupNode, 'mentor:properties');

		if (properties.getChildren().length > 0) {
			result.push(properties);
		}

		const individuals = this.createChildNode(IndividualGroupNode, 'mentor:individuals');

		if (individuals.getChildren().length > 0) {
			result.push(individuals);
		}

		const shapes = this.createChildNode(ShapeGroupNode, 'mentor:shapes', this.getQueryOptions({ includeBlankNodes: true }));

		if (shapes.getChildren().length > 0) {
			result.push(shapes);
		}

		const rules = this.createChildNode(RuleGroupNode, 'mentor:rules', this.getQueryOptions({ includeBlankNodes: true }));

		if (rules.getChildren().length > 0) {
			result.push(rules);
		}

		const validators = this.createChildNode(ValidatorGroupNode, 'mentor:validators', this.getQueryOptions({ includeBlankNodes: true }));

		if (validators.getChildren().length > 0) {
			result.push(validators);
		}

		return result;
	}
}