import * as vscode from "vscode";
import { Uri } from "@faubulous/mentor-rdf";
import { mentor } from "@/mentor";
import { getNamespaceIriFromPrefixedName, getTripleComponentType } from "@/utilities";
import { TurtleDocument } from '@/languages/turtle/turtle-document';
import { TurtleFeatureProvider } from '@/languages/turtle/turtle-feature-provider';

export class TurtleCompletionItemProvider extends TurtleFeatureProvider implements vscode.CompletionItemProvider<vscode.CompletionItem> {
	/**
	 * Maximum number of completion items to return.
	 */
	readonly maxCompletionItems = 10;

	provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, t: vscode.CancellationToken, completion: vscode.CompletionContext): vscode.ProviderResult<vscode.CompletionItem[]> {
		const context = mentor.getDocumentContext(document, TurtleDocument);

		if (!context) {
			return null;
		}

		const n = context.getTokenIndexAtPosition(position);

		if (n < 1) {
			return null;
		}

		const result = [];

		const currentToken = context.tokens[n];

		// TODO: Move this into SparqlAutoCompleteItemProvider as this will never be used in Turtle.
		if (this.isGraphDefinitionContext(context, n)) {
			return this.getGraphIriCompletionItems(context, n);
		}

		if (this.isPrefixDefinitionContext(context, n)) {
			return this.getPrefixCompletionItems(context, n);
		}

		if (this.isLocalPartDefinitionContext(context, n)) {
			const component = getTripleComponentType(context.tokens, n);
			const namespaceIri = getNamespaceIriFromPrefixedName(context.namespaces, currentToken.image);
			const localPart = currentToken.image.split(":")[1];

			if (namespaceIri) {
				const iri = (namespaceIri + localPart).toLowerCase();

				const graphs = [document.uri.toString()];
				graphs.push(namespaceIri);

				// Primarily query the context graph for retrieving completion items.
				for (let item of this.getLocalPartCompletionItems(context, component, iri, graphs)) {
					result.push(item);
				}

				// If none are found, query the background graph for retrieving additional items from other ontologies.
				if (result.length == 0) {
					for (let item of this.getLocalPartCompletionItems(context, component, iri, undefined)) {
						result.push(item);
					}
				}
			}
		}

		return result;
	}

	isPrefixDefinitionContext(context: TurtleDocument, tokenIndex: number): boolean {
		const currentToken = context.tokens[tokenIndex];

		return currentToken?.tokenType?.tokenName === "PN_CHARS_BASE";
	}

	getPrefixCompletionItems(context: TurtleDocument, tokenIndex: number): vscode.CompletionItem[] {
		const result = [];
		const token = context.tokens[tokenIndex];
		const prefixes = Object.keys(context.namespaces);

		for (let prefix of prefixes.filter(p => p.startsWith(token.image)).slice(0, this.maxCompletionItems)) {
			result.push(new vscode.CompletionItem(prefix, vscode.CompletionItemKind.Module));
		}

		return result;
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

		for (const graph of graphs.filter(g => g.startsWith(value)).slice(0, this.maxCompletionItems)) {
			const item = new vscode.CompletionItem(graph, vscode.CompletionItemKind.Module);

			result.push(item);
		}

		return result;
	}

	isLocalPartDefinitionContext(context: TurtleDocument, tokenIndex: number): boolean {
		const currentToken = context.tokens[tokenIndex];
		const currentType = currentToken?.tokenType?.tokenName;

		return currentType === 'PNAME_LN' || currentType === 'PNAME_NS';
	}

	getLocalPartCompletionItems(context: TurtleDocument, componentType: "subject" | "predicate" | "object" | undefined, uri: string, graphs: string[] | undefined): vscode.CompletionItem[] {
		const result = [];
		const limit = this.maxCompletionItems;

		if (componentType == "subject" || componentType == "object") {
			for (let c of mentor.vocabulary.getClasses(graphs).filter(c => c.toLowerCase().startsWith(uri)).slice(0, limit)) {
				const localPart = Uri.getLocalPart(c);

				if (!localPart) continue;

				const item = new vscode.CompletionItem(localPart, vscode.CompletionItemKind.Value);
				item.detail = context.getResourceDescription(c)?.value;

				result.push(item);
			}

			for (let x of mentor.vocabulary.getIndividuals(graphs).sort().filter(x => x.toLowerCase().startsWith(uri)).slice(0, limit)) {
				const localPart = Uri.getLocalPart(x);

				if (!localPart) continue;

				const item = new vscode.CompletionItem(localPart, vscode.CompletionItemKind.Value);
				item.detail = context.getResourceDescription(x)?.value;

				result.push(item);
			}
		}

		for (let p of mentor.vocabulary.getProperties(graphs).sort().filter(p => p.toLowerCase().startsWith(uri)).slice(0, limit)) {
			const localPart = Uri.getLocalPart(p);

			if (!localPart) continue;

			const item = new vscode.CompletionItem(localPart, vscode.CompletionItemKind.Value);
			item.detail = context.getResourceDescription(p)?.value;

			result.push(item);
		}

		return result.sort().slice(0, limit);
	}

	resolveCompletionItem?(item: vscode.CompletionItem, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CompletionItem> {
		return item;
	}
}