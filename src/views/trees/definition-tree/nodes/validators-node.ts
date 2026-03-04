import * as vscode from "vscode";
import { _SH, SH } from "@faubulous/mentor-rdf";
import { container, VocabularyRepository } from "@src/container";
import { ValidatorClassNode } from "./validator-class-node";

/**
 * Node of a SHACL rule in the definition tree.
 */
export class ValidatorsNode extends ValidatorClassNode {
	private get vocabulary() {
		return container.resolve(VocabularyRepository);
	}

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
}