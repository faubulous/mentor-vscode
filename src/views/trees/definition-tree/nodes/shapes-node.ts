import * as vscode from "vscode";
import { _SH, SH } from "@faubulous/mentor-rdf";
import { container, VocabularyRepository } from "@src/container";
import { ShapeClassNode } from "./shape-class-node";

export class ShapesNode extends ShapeClassNode {
	private get vocabulary() {
		return container.resolve(VocabularyRepository);
	}

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
}