import { ClassNode } from "./class-node";
import { DefinitionTreeNode } from "../definition-tree-node";
import { IndividualNode } from "./individual-node";
import { PropertyNode } from "./property-node";
import { ResourceNodeProvider } from "./resource-node-provider";
import { RuleNode } from "./rule-node";
import { ShapeNode } from "./shape-node";
import { ValidatorNode } from "./validator-node";

/**
 * A node provider for OWL ontology nodes.
 */
export class OntologyNodeProvider extends ResourceNodeProvider {
	/**
	 * Get the children of an ontology node.
	 * @param node An ontology node.
	 * @returns An array of children.
	 */
	getNodeChildren(node: DefinitionTreeNode): DefinitionTreeNode[] {
		if (!this.context) {
			return [];
		}

		const result = [];

		// Note: Do not override the node options includeReferenced setting if it is already set.
		// const includeReferenced = node.options?.includeReferenced === undefined && this.showReferences && node.uri != null;
		// const options = { ...node.options, includeReferenced: includeReferenced };
		const options = { ...node.options };

		const classes = new ClassNode(this.context, node.id + '/classes', undefined, options);
		classes.contextValue = "classes";

		if (this.getClassNodeChildren(classes).length > 0) {
			result.push(classes);
		}

		const properties = new PropertyNode(this.context, node.id + '/properties', undefined, options);
		properties.contextValue = "properties";

		if (this.getPropertyNodeChildren(properties).length > 0) {
			result.push(properties);
		}

		const individuals = new IndividualNode(this.context, node.id + '/individuals', undefined, options);
		individuals.contextValue = "individuals";

		if (this.getIndividualNodeChildren(individuals).length > 0) {
			result.push(individuals);
		}

		const shapes = new ShapeNode(this.context, node.id + '/shapes', undefined, { ...options, includeBlankNodes: true });
		shapes.contextValue = "shapes";

		if (this.getShapeNodeChildren(shapes).length > 0) {
			result.push(shapes);
		}

		const rules = new RuleNode(this.context, node.id + '/rules', undefined, { ...options, includeBlankNodes: true });
		rules.contextValue = "rules";

		if (this.getRuleNodeChildren(rules).length > 0) {
			result.push(rules);
		}

		const validators = new ValidatorNode(this.context, node.id + '/validators', undefined, { ...options, includeBlankNodes: true });
		validators.contextValue = "validators";

		if (this.getValidatorNodeChildren(validators).length > 0) {
			result.push(validators);
		}

		return result;
	}
}