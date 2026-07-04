import * as vscode from "vscode";
import { container } from "tsyringe";
import { Uri, VocabularyRepository } from "@faubulous/mentor-rdf";
import { IToken, RdfToken } from "@faubulous/mentor-rdf-parsers";
import { ServiceToken } from '@src/services/tokens';
import { IDocumentContextService } from '@src/services/document';
import { getNamespaceIriFromPrefixedName, getPropertyTypeFromRange, getTokenIndexAtPosition, getTripleComponentType, isTypeAssertionObject, TripleComonentType } from "@src/utilities";
import { TurtleDocument } from '@src/languages/turtle/turtle-document';
import { TurtleFeatureProvider } from '@src/languages/turtle/turtle-feature-provider';
import { WorkspaceUri } from "@src/providers/workspace-uri";

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

	protected get contextService() {
		return container.resolve<IDocumentContextService>(ServiceToken.DocumentContextService);
	}

	private get vocabulary() {
		return container.resolve<VocabularyRepository>(ServiceToken.VocabularyRepository);
	}

	resolveCompletionItem?(item: vscode.CompletionItem, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CompletionItem> {
		return item;
	}

	provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, t: vscode.CancellationToken, completion: vscode.CompletionContext): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
		const context = this.contextService.getDocumentContext(document, TurtleDocument);

		if (!context) {
			return null;
		}

		// Tokenize the current document text synchronously so that completions
		// are always based on the up-to-date buffer content. This avoids waiting
		// for token delivery from the language server and also makes completions
		// work for documents that are not eagerly indexed (e.g. untitled documents).
		const tokens = context.tokenize(document.getText());

		const n = getTokenIndexAtPosition(tokens, position);

		if (n < 1) {
			return null;
		}

		return this.getCompletionItems(document, context, tokens, n);
	}

	protected getCompletionItems(document: vscode.TextDocument, context: TurtleDocument, tokens: IToken[], tokenIndex: number): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
		let result: IriCompletionItem[] = [];
		let queryGraphs: string[] | undefined;
		let componentType: TripleComonentType;
		let isTypeAssertion = false;

		if (this._isLocalPartDefinitionContext(tokens, tokenIndex)) {
			// Note: The context's graph IRI falls back to the document URI for documents
			// that cannot be mapped into the workspace (e.g. untitled documents). It is
			// the graph where the document's triples are stored.
			const documentIri = WorkspaceUri.toCanonicalString(context.graphIri);

			componentType = getTripleComponentType(tokens, tokenIndex);
			isTypeAssertion = componentType === 'object' && isTypeAssertionObject(tokens, tokenIndex, context.namespaces);

			const currentToken = tokens[tokenIndex];
			const namespaceIri = getNamespaceIriFromPrefixedName(context.namespaces, currentToken.image);
			const localPart = currentToken.image.split(":")[1];

			if (namespaceIri) {
				const iri = (namespaceIri + localPart).toLowerCase();

				queryGraphs = [documentIri, namespaceIri];

				// Primarily query the context graph for retrieving completion items.
				result = this._getLocalPartCompletionItems(componentType, iri, queryGraphs);

				// If none are found, query the background graph for retrieving additional items from other ontologies.
				if (result.length == 0) {
					queryGraphs = undefined;
					result = this._getLocalPartCompletionItems(componentType, iri, undefined);
				}
			}
		}

		let items: IriCompletionItem[] = [];

		if (result.length > 0) {
			// The completion widget can only render the built-in symbol icons via the
			// item kind, so map the resource categories from the definition tree to
			// the closest matching kinds: classes → Class, data properties → Property,
			// object properties (relations) → Reference, individuals → Value.
			const classes = new Set(this.vocabulary.getClasses(queryGraphs));
			const properties = new Set(this.vocabulary.getProperties(queryGraphs));

			// Rank the candidates by their relevance for the position in the triple
			// BEFORE truncation so that preferred categories survive the cut-off:
			// classes for type assertion objects, classes and individuals for subjects
			// and other objects. The candidates are already sorted by label, and
			// Array.sort is stable, so sorting by priority yields (priority, label) order.
			const priorities = new Map<string, number>();

			for (const item of result) {
				priorities.set(item.iri, this._getCompletionItemPriority(item.iri, componentType, isTypeAssertion, classes, properties));
			}

			result.sort((a, b) => priorities.get(a.iri)! - priorities.get(b.iri)!);

			items = result.slice(0, this.maxCompletionItems);

			for (const item of items) {
				// Encode the priority in the sort text so that the displayed order also
				// respects the position preference when VS Code's fuzzy scores tie.
				item.sortText = `${priorities.get(item.iri)}_${item.label}`;
				item.kind = this._getCompletionItemKind(item.iri, queryGraphs, classes, properties);
				item.detail = context.getResourceDescription(item.iri)?.value;
			}
		}

		// When the result is truncated, mark the list as incomplete so that VS Code
		// re-invokes the provider on further keystrokes. Otherwise VS Code only
		// filters the initially returned items client-side and matching items beyond
		// the cut-off would never appear as the user narrows the search by typing.
		const isIncomplete = result.length > this.maxCompletionItems;

		return new vscode.CompletionList(items, isIncomplete);
	}

	/**
	 * Ranks a completion candidate by its relevance for the position in the triple.
	 * Lower values rank higher.
	 *
	 * - Type assertion objects (`a` / `rdf:type`): classes (0) before individuals (1) before properties (2).
	 * - Subjects and other objects: classes and individuals (0) before properties (1).
	 * - Predicates: uniform priority; the candidates are properties only.
	 *
	 * @param iri The IRI of the completion candidate.
	 * @param componentType The position of the completion in the triple.
	 * @param isTypeAssertion Whether the completion is the object of a type assertion.
	 * @param classes The set of class IRIs defined in the queried graphs.
	 * @param properties The set of property IRIs defined in the queried graphs.
	 */
	private _getCompletionItemPriority(iri: string, componentType: TripleComonentType, isTypeAssertion: boolean, classes: Set<string>, properties: Set<string>): number {
		if (componentType === 'predicate') {
			return 0;
		}

		if (isTypeAssertion) {
			if (classes.has(iri)) {
				return 0;
			}

			return properties.has(iri) ? 2 : 1;
		}

		// Subjects and non-type-assertion objects: prefer named individuals and
		// classes over properties.
		return properties.has(iri) ? 1 : 0;
	}

	/**
	 * Determines the completion item kind for a resource IRI using the same
	 * classification as the definition tree icons.
	 * @param iri The IRI of the completion candidate.
	 * @param graphs The graphs that were queried for the completion candidates.
	 * @param classes The set of class IRIs defined in the queried graphs.
	 * @param properties The set of property IRIs defined in the queried graphs.
	 */
	private _getCompletionItemKind(iri: string, graphs: string[] | undefined, classes: Set<string>, properties: Set<string>): vscode.CompletionItemKind {
		if (properties.has(iri)) {
			// Distinguish literal-valued data properties from object properties
			// (relations) based on the property range, as the definition tree does.
			const range = this.vocabulary.getRange(graphs, iri) ?? this.vocabulary.getDatatype(graphs, iri);

			return getPropertyTypeFromRange(range) === 'dataProperty'
				? vscode.CompletionItemKind.Field
				: vscode.CompletionItemKind.Interface;
		}

		if (classes.has(iri)) {
			return vscode.CompletionItemKind.Class;
		} else {
			return vscode.CompletionItemKind.Value;
		}
	}

	private _isLocalPartDefinitionContext(tokens: IToken[], tokenIndex: number): boolean {
		const currentToken = tokens[tokenIndex];
		const currentType = currentToken?.tokenType.name;

		return currentType === RdfToken.PNAME_LN.name || currentType === RdfToken.PNAME_NS.name;
	}

	/**
	 * Collects all completion items whose IRI starts with the given search prefix.
	 * @returns All matching items sorted by label; the caller is responsible for truncation.
	 */
	private _getLocalPartCompletionItems(componentType: TripleComonentType, uri: string, graphs: string[] | undefined): IriCompletionItem[] {
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

		// Sort by label so that truncation by the caller is deterministic. Note that
		// sorting the items without a comparator would compare their object identity
		// which is meaningless.
		return Object.values(items).sort((a, b) => (a.label as string).localeCompare(b.label as string));
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