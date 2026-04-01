import * as vscode from "vscode";
import { RDF } from "@faubulous/mentor-rdf";
import { TreeNode, sortByLabel } from "@src/views/trees/tree-node";
import { DefinitionTreeNode } from "../../definition-tree-node";
import { PropertyNode } from "./property-node";
import { PropertyClassNode } from "../properties/property-class-node";

/**
 * Node of a property in the definition tree.
 */
export class PropertiesNode extends PropertyClassNode {
	override getContextValue(): string {
		return 'properties';
	}

	override getIcon(): vscode.ThemeIcon | undefined {
		return undefined;
	}

	override getLabel(): vscode.TreeItemLabel {
		return { label: 'Properties' };
	}

	override getDescription(): string {
		const graphs = this.getOntologyGraphs();
		const options = this.getQueryOptions();
		const properties = [...this.vocabulary.getProperties(graphs, options)];

		return properties.length.toString();
	}

	override hasChildren(): boolean {
		const graphs = this.getOntologyGraphs();
		const options = this.getQueryOptions();
		const showPropertyTypes = this.settings.get('view.showPropertyTypes', true);

		if (showPropertyTypes) {
			const types = this.vocabulary.getPropertyTypes(graphs, options);

			for (const _ of types) {
				return true;
			}
		} else {
			const properties = this.vocabulary.getSubProperties(graphs, undefined, options);

			for (const _ of properties) {
				return true;
			}
		}

		return false;
	}

	override getChildren(): TreeNode[] {
		const result = [];
		const graphs = this.getOntologyGraphs();
		const options = this.getQueryOptions();
		const showPropertyTypes = this.settings.get('view.showPropertyTypes', true);

		if (showPropertyTypes) {
			const types = this.vocabulary.getPropertyTypes(graphs, options);

			for (let type of types) {
				result.push(this.createChildNode(PropertyClassNode, type));
			}
		} else {
			const properties = this.vocabulary.getSubProperties(graphs, undefined, options);

			for (let p of properties) {
				result.push(this.createChildNode(PropertyNode, p));
			}
		}

		return sortByLabel(result);
	}

	override getTooltip(): vscode.MarkdownString | undefined {
		return undefined;
	}

	override resolveNodeForUri(iri: string): DefinitionTreeNode | undefined {
		const graphs = this.getOntologyGraphs();

		if (!this.vocabulary.hasType(graphs, iri, RDF.Property)) {
			return undefined;
		}

		const options = this.getQueryOptions();

		if (options.includeReferenced) {
			// If referenced classes are included, we want to include classes 
			// that are defined in other ontologies.
			options.definedBy = null;
		}

		const rootToNode = [...this.vocabulary.getRootPropertiesPath(graphs, iri, options)].reverse();
		rootToNode.push(iri);

		if (this.settings.get('view.showPropertyTypes', true)) {
			// Properties are grouped by type — try each type branch.
			for (const typeNode of this.getChildren() as DefinitionTreeNode[]) {
				const found = typeNode.walkHierarchyPath(rootToNode);

				if (found) {
					return found;
				}
			}

			return undefined;
		}

		return this.walkHierarchyPath(rootToNode);
	}
}