import * as vscode from "vscode";
import { _SH, SH } from "@faubulous/mentor-rdf";
import { mentor } from "@/mentor";
import { RuleClassNode } from "./rule-class-node";

/**
 * Node of a SHACL rule in the definition tree.
 */
export class RuleGroupNode extends RuleClassNode {
	uri = SH.Rule;

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
		const rules = mentor.vocabulary.getRules(this.getDocumentGraphs(), this.getQueryOptions());

		return rules.length.toString();
	}

	override getTooltip(): vscode.MarkdownString | undefined {
		return undefined;
	}
}