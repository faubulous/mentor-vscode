import * as vscode from "vscode";
import { SH } from "@faubulous/mentor-rdf";
import { DefinitionTreeNode } from "../../definition-tree-node";
import { ValidatorClassNode } from "./validator-class-node";

/**
 * Node of a SHACL rule in the definition tree.
 */
export class ValidatorsNode extends ValidatorClassNode {
	override getContextValue(): string {
		return "validators";
	}

	override getIcon() {
		return undefined;
	}

	override getLabel() {
		return { label: "Validators" };
	}

	override getDescription(): string {
		const graphs = this.getDocumentGraphs();
		const options = this.getQueryOptions();
		const validators = this.vocabulary.getValidators(graphs, options);

		return [...validators].length.toString();
	}

	override getTooltip(): vscode.MarkdownString | undefined {
		return undefined;
	}

	override resolveNodeForUri(iri: string): DefinitionTreeNode | undefined {
		const graphs = this.getOntologyGraphs();
		const options = this.getQueryOptions();

		if (this.vocabulary.hasType(graphs, iri, SH.Validator)) {
			const rootToTarget = [...this.vocabulary.getRootShapePath(graphs, iri, options)].reverse();
			rootToTarget.push(iri);

			return this.walkHierarchyPath(rootToTarget);
		}

		for (const typeIri of this.vocabulary.getIndividualTypes(graphs, iri)) {
			const rootToType = [...this.vocabulary.getRootShapePath(graphs, typeIri, options)].reverse();
			rootToType.push(typeIri);

			const typeNode = this.walkHierarchyPath(rootToType);

			if (typeNode) {
				const instances = typeNode.getChildren() as DefinitionTreeNode[];
				const found = instances.find(n => n.uri === iri);

				if (found) {
					return found;
				}
			}
		}

		return undefined;
	}
}