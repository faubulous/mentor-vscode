import * as vscode from "vscode";
import { Uri } from "@faubulous/mentor-rdf";
import { mentor } from "@src/mentor";
import { take } from "@src/utilities";
import { getNamespaceIriFromPrefixedName, getTripleComponentType } from "@src/utilities";
import { TurtleDocument } from '@src/languages/turtle/turtle-document';
import { TurtleFeatureProvider } from '@src/languages/turtle/turtle-feature-provider';

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

		return this.getCompletionItems(document, context, n);
	}

	getCompletionItems(document: vscode.TextDocument, context: TurtleDocument, tokenIndex: number): vscode.ProviderResult<vscode.CompletionItem[]> {
		const result = [];

		if (this.isPrefixDefinitionContext(context, tokenIndex)) {
			return this.getPrefixCompletionItems(context, tokenIndex);
		}

		const currentToken = context.tokens[tokenIndex];

		if (this.isLocalPartDefinitionContext(context, tokenIndex)) {
			const component = getTripleComponentType(context.tokens, tokenIndex);
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

	isLocalPartDefinitionContext(context: TurtleDocument, tokenIndex: number): boolean {
		const currentToken = context.tokens[tokenIndex];
		const currentType = currentToken?.tokenType?.tokenName;

		return currentType === 'PNAME_LN' || currentType === 'PNAME_NS';
	}

	getLocalPartCompletionItems(context: TurtleDocument, componentType: "subject" | "predicate" | "object" | undefined, uri: string, graphs: string[] | undefined): vscode.CompletionItem[] {
		const result = [];
		const limit = this.maxCompletionItems;

		if (componentType == "subject" || componentType == "object") {
			for (let c of take(mentor.vocabulary.getClasses(graphs), limit).filter(c => c.toLowerCase().startsWith(uri))) {
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

		for (let p of take(mentor.vocabulary.getProperties(graphs), limit).sort().filter(p => p.toLowerCase().startsWith(uri))) {
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