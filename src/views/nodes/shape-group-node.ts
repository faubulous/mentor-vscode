import * as vscode from "vscode";
import { _SH, SH } from "@faubulous/mentor-rdf";
import { mentor } from "../../mentor";
import { ShapeClassNode } from "./shape-class-node";

export class ShapeGroupNode extends ShapeClassNode {
	uri = SH.Shape;

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
		const shapes = mentor.vocabulary.getShapes(this.getDocumentGraphs(), undefined, this.getQueryOptions());

		return shapes.length.toString();
	}

		override getTooltip(): vscode.MarkdownString | undefined {
			return undefined;
		}
}