import * as vscode from "vscode";
import * as mentor from "../mentor";
import { FeatureProvider } from "./feature-provider";
import { getUriLabel, getNamespaceUriFromPrefixedName, getTripleComponentType } from "../utilities";

export class CompletionItemProvider extends FeatureProvider implements vscode.CompletionItemProvider<vscode.CompletionItem> {
	provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, t: vscode.CancellationToken, completion: vscode.CompletionContext): vscode.ProviderResult<vscode.CompletionItem[]> {
		const context = this.getDocumentContext(document);

		if (!context) {
			return null;
		}

		const token = this.getTokensAtPosition(context.tokens, position)[0];

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
			const namespace = getNamespaceUriFromPrefixedName(context.namespaces, token.image);
			const label = token.image.split(":")[1];

			// TODOs
			// - Add support for returning completions for prefixed names that are not defined in the document.
			//  - However, need a proper solution for indexing the project (imported) ontologies first.

			if (namespace) {
				const uri = (namespace + label).toLowerCase();

				const graphs = mentor.store.getContextGraphs(document.uri.toString());
				graphs.push(namespace);

				if (component == "subject" || component == "object") {
					for (let c of mentor.ontology.getClasses(graphs).filter(c => c.toLowerCase().startsWith(uri))) {
						const item = new vscode.CompletionItem(getUriLabel(c), vscode.CompletionItemKind.Class);
						item.detail = context.getResourceDescription(c);

						result.push(item);
					}

					for (let x of mentor.ontology.getIndividuals(graphs).filter(x => x.toLowerCase().startsWith(uri))) {
						const item = new vscode.CompletionItem(getUriLabel(x), vscode.CompletionItemKind.Field);
						item.detail = context.getResourceDescription(x);

						result.push(item);
					}
				}

				for (let p of mentor.ontology.getProperties(graphs).filter(p => p.toLowerCase().startsWith(uri))) {
					const item = new vscode.CompletionItem(getUriLabel(p), vscode.CompletionItemKind.Value);
					item.detail = context.getResourceDescription(p);

					result.push(item);
				}
			}
		}

		return result;
	}

	resolveCompletionItem?(item: vscode.CompletionItem, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CompletionItem> {
		return item;
	}
}