import * as vscode from "vscode";
import { mentor } from "@/mentor";
import { DocumentContext } from "@/document-context";
import { getIriLocalPart, getNamespaceIriFromPrefixedName, getTripleComponentType } from "@/utilities";
import { TurtleFeatureProvider } from '@/languages/turtle/turtle-feature-provider';
import { TurtleDocument } from "../turtle-document";

export class TurtleCompletionItemProvider extends TurtleFeatureProvider implements vscode.CompletionItemProvider<vscode.CompletionItem> {
	provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, t: vscode.CancellationToken, completion: vscode.CompletionContext): vscode.ProviderResult<vscode.CompletionItem[]> {
		const context = mentor.getDocumentContext(document, TurtleDocument);

		if (!context) {
			return null;
		}

		const token = context.getTokensAtPosition(position)[0];

		if (!token) {
			return null;
		}

		let result = [];

		const tokenType = token.tokenType?.tokenName;

		if (tokenType == "PN_CHARS_BASE") {
			for (let prefix of Object.keys(context.namespaces).filter(p => p.startsWith(token.image))) {
				result.push(new vscode.CompletionItem(prefix, vscode.CompletionItemKind.Module));
			}
		} else if (tokenType == "PNAME_LN" || tokenType == "PNAME_NS") {
			const component = getTripleComponentType(context.tokens, token);
			const namespaceIri = getNamespaceIriFromPrefixedName(context.namespaces, token.image);
			const localName = token.image.split(":")[1];

			if (namespaceIri) {
				const iri = (namespaceIri + localName).toLowerCase();

				const graphs = [document.uri.toString()];
				graphs.push(namespaceIri);

				// Primarily query the context graph for retrieving completion items.
				for (let item of this.getCompletionItems(context, component, iri, graphs)) {
					result.push(item);
				}

				// If none are found, query the background graph for retrieving additional items from other ontologies.
				if (result.length == 0) {
					for (let item of this.getCompletionItems(context, component, iri, undefined)) {
						result.push(item);
					}
				}
			}
		}

		return result;
	}

	getCompletionItems(context: DocumentContext, component: "subject" | "predicate" | "object" | undefined, uri: string, graphs: string[] | undefined, limit: number = 10): vscode.CompletionItem[] {
		let result = [];

		if (component == "subject" || component == "object") {
			for (let c of mentor.vocabulary.getClasses(graphs).filter(c => c.toLowerCase().startsWith(uri))) {
				const item = new vscode.CompletionItem(getIriLocalPart(c), vscode.CompletionItemKind.Class);
				item.detail = context.getResourceDescription(c)?.value;

				result.push(item);
			}

			for (let x of mentor.vocabulary.getIndividuals(graphs).sort().filter(x => x.toLowerCase().startsWith(uri))) {
				const item = new vscode.CompletionItem(getIriLocalPart(x), vscode.CompletionItemKind.Field);
				item.detail = context.getResourceDescription(x)?.value;

				result.push(item);
			}
		}

		for (let p of mentor.vocabulary.getProperties(graphs).sort().filter(p => p.toLowerCase().startsWith(uri))) {
			const item = new vscode.CompletionItem(getIriLocalPart(p), vscode.CompletionItemKind.Value);
			item.detail = context.getResourceDescription(p)?.value;

			result.push(item);
		}

		return result.sort().slice(0, limit);
	}

	resolveCompletionItem?(item: vscode.CompletionItem, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CompletionItem> {
		return item;
	}
}