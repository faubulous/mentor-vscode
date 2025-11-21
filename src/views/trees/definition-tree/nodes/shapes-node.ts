import * as vscode from "vscode";
import { _SH, SH } from "@faubulous/mentor-rdf";
import { mentor } from "@src/mentor";
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
		const shapes = mentor.vocabulary.getShapes(graphs, undefined, options);

		return [...shapes].length.toString();
	}

	override getTooltip(): vscode.MarkdownString | undefined {
		return undefined;
	}
}