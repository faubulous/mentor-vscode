import { _SH, SH } from "@faubulous/mentor-rdf";
import { mentor } from "../../mentor";
import { ShapeClassNode } from "./shape-class-node";

export class ShapeGroupNode extends ShapeClassNode {
	uri = SH.Shape;

	contextValue = "shapes";

	override getIcon() {
		return undefined;
	}

	override getLabel() {
		return { label: "Shapes" };
	}

	override getDescription(): string {
		const shapes = mentor.vocabulary.getShapes(this.graphs, undefined, this.options);

		return shapes.length.toString();
	}
}