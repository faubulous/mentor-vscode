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
		if (this.uri) {
			return super.getLabel();
		} else {
			return { label: "unknown" };
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
			const version = mentor.vocabulary.getOntologyVersionInfo(this.graphs, this.uri);

			if (version) {
				result += " " + version;
			}
		}

		return result;
	}

	override getChildren(): DefinitionTreeNode[] {
		const result = [];

		const classes = new ClassGroupNode(this.document, this.id + '/classes', undefined, this.options);

		if (classes.getChildren().length > 0) {
			result.push(classes);
		}

		const properties = new PropertyGroupNode(this.document, this.id + '/properties', undefined, this.options);

		if (properties.getChildren().length > 0) {
			result.push(properties);
		}

		const individuals = new IndividualGroupNode(this.document, this.id + '/individuals', undefined, this.options);

		if (individuals.getChildren().length > 0) {
			result.push(individuals);
		}

		const shapes = new ShapeGroupNode(this.document, this.id + '/shapes', undefined, {
			...this.options,
			includeBlankNodes: true
		});

		if (shapes.getChildren().length > 0) {
			result.push(shapes);
		}

		const rules = new RuleGroupNode(this.document, this.id + '/rules', undefined, {
			...this.options,
			includeBlankNodes: true
		});

		if (rules.getChildren().length > 0) {
			result.push(rules);
		}

		const validators = new ValidatorGroupNode(this.document, this.id + '/validators', undefined, {
			...this.options,
			includeBlankNodes: true
		});

		if (validators.getChildren().length > 0) {
			result.push(validators);
		}

		return result;
	}
}