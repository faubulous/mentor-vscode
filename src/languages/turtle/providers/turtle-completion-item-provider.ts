import * as vscode from "vscode";
import { IToken, RdfToken } from "@faubulous/mentor-rdf-parsers";
import { IDocumentContextService } from '@src/services/document';
import { TermCatalogueService } from '@src/services/vocabulary/term-catalogue-service';
import { ResourceOptionData, TERM_SEARCH_LIMIT, TermSearchTargetType } from '@src/services/vocabulary/term-search';
import { getTokenIndexAfterPosition, getTokenIndexAtPosition, getTokenPosition } from "@src/utilities";
import { getTermSearchTarget } from '@src/utilities/term-search-target';
import { resolvePrefixDefinitionService } from '@src/languages/resolve-prefix-definition-service';
import { TurtleDocument } from '@src/languages/turtle/turtle-document';
import { TurtleFeatureProvider } from '@src/languages/turtle/turtle-feature-provider';

/**
 * The text of a name being typed: a prefixed name, or a word to search terms by their labels.
 */
const NAME_PATTERN = /[\p{L}\p{N}_.:-]+/u;


/**
 * Gives the edits that declare a prefix in a document, as accepting a term of an undeclared
 * namespace does.
 */
export type PrefixDeclarationEdits = (document: vscode.TextDocument, prefix: string, namespaceIri: string) => Promise<vscode.TextEdit[]>;

/**
 * The text being typed at the cursor and what it replaces.
 */
interface TypedName {
	/**
	 * The text typed so far.
	 */
	text: string;

	/**
	 * The range a picked term replaces.
	 */
	range: vscode.Range;

	/**
	 * The index of the first token at or after the name, which the statement before it ends at.
	 */
	end: number;
}

/**
 * Provides the completion of terms in Turtle and TriG documents, and in SPARQL queries, which
 * extend it: the terms of the workspace that fit the place in the statement, searched in the same
 * term catalogue as the pickers of the form editor and ranked the same way. A predicate is
 * offered after a subject, a class as the object of `a`, a datatype after `^^`, a resource
 * elsewhere; those that fit the statement by domain, shapes or range come first. A prefixed name
 * and a bare word are both searched, the word by labels too; a term of a namespace the document
 * declares no prefix for declares the prefix the workspace uses as it is accepted.
 */
export class TurtleCompletionItemProvider extends TurtleFeatureProvider implements vscode.CompletionItemProvider<vscode.CompletionItem> {
	/**
	 * Create the provider.
	 * @param _contextService Gives the document contexts.
	 * @param _catalogue Searches the terms of the workspace.
	 * @param _prefixEdits Gives the edits that declare a prefix in a document.
	 */
	constructor(
		protected readonly _contextService: IDocumentContextService,
		protected readonly _catalogue: TermCatalogueService,
		private readonly _prefixEdits: PrefixDeclarationEdits = _declarePrefix
	) {
		super();
	}

	resolveCompletionItem?(item: vscode.CompletionItem, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CompletionItem> {
		return item;
	}

	provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, t: vscode.CancellationToken, completion: vscode.CompletionContext): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
		// The suggestions are read from the triple store; while the document is
		// loading, its own triples may not be there yet.
		const uri = document.uri.toString();

		if (this._contextService.isLoading(uri)) {
			return this._contextService.waitUntilLoaded(uri).then(() => this.provideCompletionItems(document, position, t, completion));
		}

		const context = this._contextService.getDocumentContext(document, TurtleDocument);

		if (!context || t.isCancellationRequested) {
			return null;
		}

		// Tokenize the current document text so that completions are always based on
		// the up-to-date buffer content, also for documents that are not indexed (e.g.
		// untitled documents). The tokens are cached per document version and shared
		// with the other providers that run on the same keystroke.
		const tokens = context.tokenizeDocument(document);

		if (t.isCancellationRequested) {
			return null;
		}

		return this.getCompletionItems(document, context, tokens, position);
	}

	/**
	 * Complete the name typed at a position by the terms of the workspace that fit the place.
	 * @param document The document.
	 * @param context The context of the document.
	 * @param tokens The tokens of the document.
	 * @param position The position of the cursor.
	 * @returns The completion list, always incomplete so typing on searches again; `null` where
	 * nothing is completed, as in a literal, a comment or a prefix declaration.
	 */
	protected async getCompletionItems(document: vscode.TextDocument, context: TurtleDocument, tokens: IToken[], position: vscode.Position): Promise<vscode.CompletionItem[] | vscode.CompletionList | null> {
		const typed = this._typedNameAt(document, tokens, position);
		const target = typed ? getTermSearchTarget(tokens, typed.end, context.namespaces) : undefined;

		if (!typed || !target) {
			return null;
		}

		const options = await this._catalogue.search({ ...target, text: typed.text, limit: TERM_SEARCH_LIMIT }, context);
		const items = await Promise.all(options.map((option, rank) => this._itemOf(document, context, option, rank, typed, target.targetType)));

		return new vscode.CompletionList(items, true);
	}

	/**
	 * The name typed at the cursor: the prefixed name the cursor is in, else the word the lexer
	 * skipped there, else nothing typed yet.
	 * @param document The document.
	 * @param tokens The tokens of the document.
	 * @param position The position of the cursor.
	 * @returns The name, or `undefined` where the cursor is in another token, such as a literal.
	 */
	private _typedNameAt(document: vscode.TextDocument, tokens: IToken[], position: vscode.Position): TypedName | undefined {
		const index = getTokenIndexAtPosition(tokens, position);

		if (index >= 0) {
			const token = tokens[index];

			// Only a prefixed name is completed where the cursor is in a token.
			if (token.tokenType.name !== RdfToken.PNAME_LN.name && token.tokenType.name !== RdfToken.PNAME_NS.name) {
				return undefined;
			}

			const { start, end } = getTokenPosition(token);
			const range = new vscode.Range(start.line, start.character, end.line, end.character);

			return { text: document.getText(new vscode.Range(range.start, position)), range, end: index };
		}

		const word = document.getWordRangeAtPosition(position, NAME_PATTERN);
		const range = word ?? new vscode.Range(position, position);

		return { text: document.getText(new vscode.Range(range.start, position)), range, end: getTokenIndexAfterPosition(tokens, range.start) };
	}

	/**
	 * The completion item of a term: its prefixed name, else its IRI, with its label beside it and
	 * its description in the details, ranked as the catalogue ranked it.
	 * @param document The document.
	 * @param context The context of the document.
	 * @param option The term.
	 * @param rank The rank of the term among the terms found.
	 * @param typed The name typed, which the term replaces.
	 * @param targetType The type of terms searched.
	 * @returns The item.
	 */
	private async _itemOf(document: vscode.TextDocument, context: TurtleDocument, option: ResourceOptionData, rank: number, typed: TypedName, targetType: TermSearchTargetType): Promise<vscode.CompletionItem> {
		const name = option.prefixedName ?? `<${option.subject.value}>`;
		const item = new vscode.CompletionItem({ label: name, description: option.label !== name ? option.label : undefined }, _completionItemKindOf(targetType, option.iconName));

		item.insertText = name;
		item.range = typed.range;
		// The catalogue matched and ranked the terms; the editor keeps them all, in its order.
		item.filterText = typed.text;
		item.sortText = rank.toString().padStart(4, '0');
		item.detail = context.getResourceDescription(option.subject.value)?.value;

		if (option.missingPrefix) {
			item.additionalTextEdits = await this._prefixEdits(document, option.missingPrefix.prefix, option.missingPrefix.namespace);
		}

		return item;
	}
}

/**
 * The kind of completion item a term shows as, by the type of terms searched and its glyph:
 * datatypes as type parameters, classes as classes, properties of literals as fields and other
 * properties as interfaces, the rest as values.
 * @param targetType The type of terms searched.
 * @param iconName The glyph of the term.
 * @returns The kind.
 */
function _completionItemKindOf(targetType: TermSearchTargetType, iconName: string | undefined): vscode.CompletionItemKind {
	if (targetType === 'datatype') {
		return vscode.CompletionItemKind.TypeParameter;
	}

	if (iconName?.endsWith('rdf-class')) {
		return vscode.CompletionItemKind.Class;
	}

	if (iconName?.endsWith('-property')) {
		return vscode.CompletionItemKind.Interface;
	}

	if (targetType === 'predicate') {
		return vscode.CompletionItemKind.Field;
	}

	return vscode.CompletionItemKind.Value;
}

/**
 * Give the edits that declare a prefix in a document, by the prefix definition service of its
 * language, which writes `@prefix` in Turtle and `PREFIX` in SPARQL.
 * @param document The document.
 * @param prefix The prefix.
 * @param namespaceIri The namespace IRI.
 * @returns The edits.
 */
async function _declarePrefix(document: vscode.TextDocument, prefix: string, namespaceIri: string): Promise<vscode.TextEdit[]> {
	const edit = await resolvePrefixDefinitionService(document).implementPrefixes(document, [{ prefix, namespaceIri }]);

	return edit.get(document.uri);
}
