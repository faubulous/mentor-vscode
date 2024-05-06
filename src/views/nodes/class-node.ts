import * as vscode from "vscode";
import * as mentor from "../../mentor";
import { RDFS, DefinitionQueryOptions } from "@faubulous/mentor-rdf";
import { ResourceNode } from "./resource-node";
import { DocumentContext } from "../../document-context";

export class ClassNode extends ResourceNode {
	contextType = RDFS.Class;

	constructor(context: DocumentContext, id: string, uri: string | undefined, options?: DefinitionQueryOptions, contextValue = "class") {
		super(context, id, uri, options);

		this.contextValue = contextValue;
	}	

	override getIcon() {
		if (this.uri) {
			let icon = 'rdf-class';

			if (!mentor.vocabulary.hasSubject(this.context.graphs, this.uri)) {
				icon += '-ref';
			}

			if (mentor.vocabulary.hasIndividuals(this.context.graphs, this.uri)) {
				icon += "-i";
			}

			return new vscode.ThemeIcon(icon, this.getIconColor());
		}
	}

	override getIconColor() {
		return new vscode.ThemeColor("mentor.color.class");
	}

	override getLabel(): vscode.TreeItemLabel {
		if (!this.uri) {
			return {
				label: "Classes"
			}
		} else {
			return {
				label: this.context.getResourceLabel(this.uri)
			}
		}
	}

	override getDescription(): string {
		let result = "";

		if (!this.uri) {
			result += mentor.vocabulary.getClasses(this.context.graphs, this.options).length.toString();
		} else {
			if (mentor.vocabulary.hasEquivalentClass(this.context.graphs, this.uri)) {
				result += "≡";
			}

			// if (mentor.vocabulary.isIntersectionOfClasses(this.context.graphs, this.uri)) {
			// 	result += "⋂";
			// } else if (mentor.vocabulary.isUnionOfClasses(this.context.graphs, this.uri)) {
			// 	result += "⋃";
			// } else if (mentor.vocabulary.hasEquivalentClass(this.context.graphs, this.uri)) {
			// 	result += "≡";
			// }
		}

		return result;
	}
}