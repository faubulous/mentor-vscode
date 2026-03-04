import * as vscode from "vscode";
import { _SH, SH } from "@faubulous/mentor-rdf";
import { container, VocabularyRepository } from "@src/container";
import { RuleClassNode } from "./rule-class-node";

/**
 * Node of a SHACL rule in the definition tree.
 */
export class RulesNode extends RuleClassNode {
	private get vocabulary() {
		return container.resolve(VocabularyRepository);
	}

	override getContextValue() {
		return 'rules';
	}

	override getIcon() {
		return undefined;
	}

	override getLabel() {
		return { label: "Rules" };
	}

	override getDescription(): string {
		const graphs = this.getDocumentGraphs();
		const options = this.getQueryOptions();
		const rules = this.vocabulary.getRules(graphs, options);

		return [...rules].length.toString();
	}

	override getTooltip(): vscode.MarkdownString | undefined {
		return undefined;
	}
}