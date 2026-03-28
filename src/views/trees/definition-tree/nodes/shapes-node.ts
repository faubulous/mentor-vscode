import * as vscode from "vscode";
import { SH } from "@faubulous/mentor-rdf";
import { DefinitionTreeNode } from "../definition-tree-node";
import { ShapeClassNode } from "./shape-class-node";

export class ShapesNode extends ShapeClassNode {
	override getContextValue() {
		return "shapes";
	}

	override getIcon() {
		return undefined;
	}

	override getLabel() {
		return { label: "Shapes" };
	}

	override getDescription(): string {
		const graphs = this.getDocumentGraphs();
		const options = this.getQueryOptions();
		const shapes = this.vocabulary.getShapes(graphs, undefined, options);

		return [...shapes].length.toString();
	}

	override getTooltip(): vscode.MarkdownString | undefined {
		return undefined;
	}

	override resolveNodeForUri(iri: string): DefinitionTreeNode | undefined {
		const graphs = this.getOntologyGraphs();
		const options = this.getQueryOptions();

		// Check if the IRI is a shape class — resolve via hierarchy path.
		if (this.vocabulary.hasType(graphs, iri, SH.Shape)) {
			const rootToTarget = [...this.vocabulary.getRootShapePath(graphs, iri, options)].reverse();
			rootToTarget.push(iri);

			return this.walkHierarchyPath(rootToTarget);
		}

		// Otherwise it is an individual shape instance — find its type class, then the instance within it.
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