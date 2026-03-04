import * as vscode from "vscode";
import { mentor } from "@src/mentor";
import { container, VocabularyRepository } from "@src/container";
import { TreeNode, sortByLabel } from "@src/views/trees/tree-node";
import { PropertyNode } from "./property-node";
import { PropertyClassNode } from "./property-class-node";

/**
 * Node of a property in the definition tree.
 */
export class PropertiesNode extends PropertyClassNode {
	private get vocabulary() {
		return container.resolve(VocabularyRepository);
	}

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
		const showPropertyTypes = mentor.settings.get('view.showPropertyTypes', true);

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
		const showPropertyTypes = mentor.settings.get('view.showPropertyTypes', true);

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
}