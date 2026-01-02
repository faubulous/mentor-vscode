import * as vscode from "vscode";
import { Uri } from "@faubulous/mentor-rdf";
import { mentor } from "@src/mentor";
import { getNamespaceIriFromPrefixedName, getTripleComponentType, TripleComonentType } from "@src/utilities";
import { TurtleDocument } from '@src/languages/turtle/turtle-document';
import { TurtleFeatureProvider } from '@src/languages/turtle/turtle-feature-provider';
import { WorkspaceUri } from "@src/workspace/workspace-uri";

class IriCompletionItem extends vscode.CompletionItem {
	/**
	 * The IRI of the subject.
	 */
	iri: string;

	/**
	 * Creates a new completion item.
	 *
	 * Completion items must have at least a {@link CompletionItem.label label} which then
	 * will be used as insert text as well as for sorting and filtering.
	 *
	 * @param iri The IRI of the completion item.
	 * @param label The label of the completion.
	 * @param kind The {@link CompletionItemKind kind} of the completion.
	 */
	constructor(iri: string, label: string | vscode.CompletionItemLabel, kind?: vscode.CompletionItemKind) {
		super(label, kind);

		this.iri = iri;
	}
}

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
			const documentIri = WorkspaceUri.toWorkspaceUri(document.uri);
			const componentType = getTripleComponentType(context.tokens, tokenIndex);
			const namespaceIri = getNamespaceIriFromPrefixedName(context.namespaces, currentToken.image);
			const localPart = currentToken.image.split(":")[1];

			if (documentIri && namespaceIri) {
				const iri = (namespaceIri + localPart).toLowerCase();

				const graphs = [documentIri.toString()];
				graphs.push(namespaceIri);

				// Primarily query the context graph for retrieving completion items.
				for (let item of this.getLocalPartCompletionItems(context, componentType, iri, graphs)) {
					result.push(item);
				}

				// If none are found, query the background graph for retrieving additional items from other ontologies.
				if (result.length == 0) {
					for (let item of this.getLocalPartCompletionItems(context, componentType, iri, undefined)) {
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

	getLocalPartCompletionItems(context: TurtleDocument, componentType: TripleComonentType, uri: string, graphs: string[] | undefined): vscode.CompletionItem[] {
		let result: IriCompletionItem[] = [];

		if (componentType === 'predicate') {
			for (let property of mentor.vocabulary.getProperties(graphs)) {
				this._addCompletionItem(result, uri, property);
			}
		} else {
			const contexts = [];

			if (graphs) {
				for (const g of graphs) {
					const c = mentor.getDocumentContextFromUri(g);

					if (c) {
						contexts.push(c);
					}
				}
			} else {
				contexts.push(...Object.values(mentor.contexts));
			}

			for (const c of contexts) {
				for (let subject of Object.keys(c.subjects)) {
					this._addCompletionItem(result, uri, subject);
				}
			}
		}

		result = result.sort().slice(0, this.maxCompletionItems);

		for (let item of result) {
			item.detail = context.getResourceDescription(item.iri)?.value;
		}

		return result.sort().slice(0, this.maxCompletionItems);
	}

	private _addCompletionItem(result: IriCompletionItem[], namespaceIri: string, subjectIri: string) {
		if (!subjectIri.toLowerCase().startsWith(namespaceIri)) {
			return;
		}

		const localPart = Uri.getLocalPart(subjectIri);

		if (!localPart) {
			return;
		}

		const item = new IriCompletionItem(subjectIri, localPart, vscode.CompletionItemKind.Value);
		item.iri = subjectIri;

		result.push(item);
	}

	resolveCompletionItem?(item: vscode.CompletionItem, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CompletionItem> {
		return item;
	}
}