import * as vscode from "vscode";
import { OWL } from "@faubulous/mentor-rdf";
import { mentor } from "../../mentor";
import { DefinitionTreeNode } from "../definition-tree-node";
import { ResourceNode } from "./resource-node";
import { ClassNode } from "./class-node";
import { PropertyNode } from "./property-node";
import { IndividualNode } from "./individual-node";
import { ShapeNode } from "./shape-node";
import { RuleNode } from "./rule-node";
import { ValidatorNode } from "./validator-node";

/**
 * Node of a ontology header in the definition tree.
 */
export class OntologyNode extends ResourceNode {
	contextType = OWL.Ontology;

	initialCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed;

	defaultLabel = "unknown";

	isReferenced = false;

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
			const version = mentor.vocabulary.getOntologyVersionInfo(this.document.graphs, this.uri);

			if (version) {
				result += " " + version;
			}
		}

		return result;
	}

	override getChildren(): DefinitionTreeNode[] {
		if (!this.document) {
			return [];
		}

		const result = [];
		const options = { ...this.options };

		const classes = new ClassNode(this.document, this.id + '/classes', undefined, options);
		classes.contextValue = "classes";

		if (classes.getChildren().length > 0) {
			result.push(classes);
		}

		const properties = new PropertyNode(this.document, this.id + '/properties', undefined, options);
		properties.contextValue = "properties";

		if (properties.getChildren().length > 0) {
			result.push(properties);
		}

		const individuals = new IndividualNode(this.document, this.id + '/individuals', undefined, options);
		individuals.contextValue = "individuals";

		if (individuals.getChildren().length > 0) {
			result.push(individuals);
		}

		const shapes = new ShapeNode(this.document, this.id + '/shapes', undefined, { ...options, includeBlankNodes: true });
		shapes.contextValue = "shapes";

		if (shapes.getChildren().length > 0) {
			result.push(shapes);
		}

		const rules = new RuleNode(this.document, this.id + '/rules', undefined, { ...options, includeBlankNodes: true });
		rules.contextValue = "rules";

		if (rules.getChildren().length > 0) {
			result.push(rules);
		}

		const validators = new ValidatorNode(this.document, this.id + '/validators', undefined, { ...options, includeBlankNodes: true });
		validators.contextValue = "validators";

		if (validators.getChildren().length > 0) {
			result.push(validators);
		}

		return result;
	}
}