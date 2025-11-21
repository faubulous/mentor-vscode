import * as vscode from "vscode";
import { _SH, SH } from "@faubulous/mentor-rdf";
import { mentor } from "@src/mentor";
import { RuleClassNode } from "./rule-class-node";

/**
 * Node of a SHACL rule in the definition tree.
 */
export class RulesNode extends RuleClassNode {
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
		const rules = mentor.vocabulary.getRules(graphs, options);

		return [...rules].length.toString();
	}

	override getTooltip(): vscode.MarkdownString | undefined {
		return undefined;
	}
}