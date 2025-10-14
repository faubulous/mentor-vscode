import * as vscode from "vscode";
import { mentor } from "@src/mentor";
import { TurtleCompletionItemProvider } from "@src/languages/turtle/providers";
import { TurtleDocument } from "@src/languages/turtle";

export class SparqlCompletionItemProvider extends TurtleCompletionItemProvider {

	override getCompletionItems(document: vscode.TextDocument, context: any, tokenIndex: number): vscode.ProviderResult<vscode.CompletionItem[]> {
		if (this.isGraphDefinitionContext(context, tokenIndex)) {
			return this.getGraphIriCompletionItems(context, tokenIndex);
		} else {
			return super.getCompletionItems(document, context, tokenIndex);
		}
	}

	isGraphDefinitionContext(context: TurtleDocument, tokenIndex: number) {
		let n = -1;

		if (context.tokens[tokenIndex].image.startsWith('<')) {
			// If the current token is either '<' or an IRI that was auto-closed with '>' (e.g. <htt>)
			n = tokenIndex;
		} else if (context.tokens[tokenIndex - 1]?.image === '<') {
			// If the token is not yet closed, then the previous token must be '<'
			n = tokenIndex - 1;
		} else {
			return false;
		}

		const previousToken = context.tokens[n - 1];

		switch (previousToken?.tokenType?.tokenName) {
			case "GRAPH":
			case "FROM":
			case "NAMED":
				return true;
			default:
				return false;
		}
	}

	getGraphIriCompletionItems(context: TurtleDocument, tokenIndex: number): vscode.CompletionItem[] {
		const result = [];
		const token = context.tokens[tokenIndex];

		// The token might be completely or partially enclosed in angle brackets.
		let value = token.image;

		if (value.startsWith('<')) {
			value = value.slice(1);
		}

		if (value.endsWith('>')) {
			value = value.slice(0, -1);
		}

		const graphs = mentor.store.getGraphs();

		for (const iri of graphs.filter(g => g.startsWith(value))) {
			const label = iri.substring(value.length);

			const item = new vscode.CompletionItem(label, vscode.CompletionItemKind.Reference);
			item.detail = iri;
			item.insertText = new vscode.SnippetString(label);

			result.push(item);
		}

		return result;
	}
}