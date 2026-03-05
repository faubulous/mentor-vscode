import * as vscode from "vscode";
import { Uri, VocabularyRepository } from "@faubulous/mentor-rdf";
import { TOKENS } from "@faubulous/mentor-rdf-parsers";
import { container } from "@src/container";
import { InjectionToken } from '@src/injection-token';
import { DocumentContextService } from "@src/services/document-context-service";
import { getNamespaceIriFromPrefixedName, getTripleComponentType, TripleComonentType } from "@src/utilities";
import { TurtleDocument } from '@src/languages/turtle/turtle-document';
import { TurtleFeatureProvider } from '@src/languages/turtle/turtle-feature-provider';
import { WorkspaceUri } from "@src/workspace/workspace-uri";

/**
 * Represents a completion item that has an associated IRI (Internationalized Resource Identifier).
 */
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

/**
 * Provides completion items for Turtle documents based on the cursor position in the document. The
 * completion items return subject/object definitions when the cursor is on a subject or object, in
 * a triple. If the cursor is on a predicate, the completion items return predicate definitions. The
 * definitions are resolved in the following order: local definitions (file), then global definitions 
 * (e.g. RDF, RDFS..).
 */
export class TurtleCompletionItemProvider extends TurtleFeatureProvider implements vscode.CompletionItemProvider<vscode.CompletionItem> {
	/**
	 * Maximum number of completion items to return.
	 */
	readonly maxCompletionItems = 10;

	private get contextService() {
		return container.resolve<DocumentContextService>(InjectionToken.DocumentContextService);
	}

	private get vocabulary() {
		return container.resolve<VocabularyRepository>(InjectionToken.VocabularyRepository);
	}

	resolveCompletionItem?(item: vscode.CompletionItem, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CompletionItem> {
		return item;
	}

	provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, t: vscode.CancellationToken, completion: vscode.CompletionContext): vscode.ProviderResult<vscode.CompletionItem[]> {
		const context = this.contextService.getDocumentContext(document, TurtleDocument);

		if (!context) {
			return null;
		}

		const n = context.getTokenIndexAtPosition(position);

		if (n < 1) {
			return null;
		}

		return this.getCompletionItems(document, context, n);
	}

	protected getCompletionItems(document: vscode.TextDocument, context: TurtleDocument, tokenIndex: number): vscode.ProviderResult<vscode.CompletionItem[]> {
		const result = [];

		if (this._isLocalPartDefinitionContext(context, tokenIndex)) {
			const documentIri = WorkspaceUri.toWorkspaceUri(document.uri);
			const componentType = getTripleComponentType(context.tokens, tokenIndex);

			const currentToken = context.tokens[tokenIndex];
			const namespaceIri = getNamespaceIriFromPrefixedName(context.namespaces, currentToken.image);
			const localPart = currentToken.image.split(":")[1];

			if (documentIri && namespaceIri) {
				const iri = (namespaceIri + localPart).toLowerCase();

				const graphs = [documentIri.toString()];
				graphs.push(namespaceIri);

				// Primarily query the context graph for retrieving completion items.
				for (let item of this._getLocalPartCompletionItems(context, componentType, iri, graphs)) {
					result.push(item);
				}

				// If none are found, query the background graph for retrieving additional items from other ontologies.
				if (result.length == 0) {
					for (let item of this._getLocalPartCompletionItems(context, componentType, iri, undefined)) {
						result.push(item);
					}
				}
			}
		}

		return result;
	}

	private _isLocalPartDefinitionContext(context: TurtleDocument, tokenIndex: number): boolean {
		const currentToken = context.tokens[tokenIndex];
		const currentType = currentToken?.tokenType.name;

		return currentType === TOKENS.PNAME_LN.name || currentType === TOKENS.PNAME_NS.name;
	}

	private _getLocalPartCompletionItems(context: TurtleDocument, componentType: TripleComonentType, uri: string, graphs: string[] | undefined): vscode.CompletionItem[] {
		let items: Record<string, IriCompletionItem> = {};

		if (componentType === 'predicate') {
			// In this case we only want to return properties.
			for (let property of this.vocabulary.getProperties(graphs)) {
				this._addLocalPartCompletionItem(items, uri, property);
			}
		} else {
			// Here we want to return all subjects, including properties as those can be subject or objects too.
			const contexts = [];

			if (graphs) {
				for (const g of graphs) {
					const c = this.contextService.getDocumentContextFromUri(g);

					if (c) {
						contexts.push(c);
					}
				}
			} else {
				contexts.push(...Object.values(this.contextService.contexts));
			}

			for (const c of contexts) {
				for (let subject of Object.keys(c.subjects)) {
					this._addLocalPartCompletionItem(items, uri, subject);
				}
			}
		}

		const result = Object.values(items).sort().slice(0, this.maxCompletionItems);

		for (let item of result) {
			item.detail = context.getResourceDescription(item.iri)?.value;
		}

		return result;
	}

	private _addLocalPartCompletionItem(result: Record<string, IriCompletionItem>, namespaceIri: string, subjectIri: string) {
		if (result[subjectIri] || !subjectIri.toLowerCase().startsWith(namespaceIri)) {
			return;
		}

		const localPart = Uri.getLocalPart(subjectIri);

		if (!localPart) {
			return;
		}

		const item = new IriCompletionItem(subjectIri, localPart, vscode.CompletionItemKind.Value);
		item.iri = subjectIri;

		result[subjectIri] = item;
	}
}