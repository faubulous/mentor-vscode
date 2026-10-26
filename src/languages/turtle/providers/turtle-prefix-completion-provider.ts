import * as vscode from 'vscode';
import { RdfToken } from '@faubulous/mentor-rdf-parsers';
import { getTokenIndexAtPosition } from '@src/utilities';
import { IDocumentContextService } from '@src/services/document';
import { IPrefixLookupService } from '@src/services/document';
import { TurtleDocument } from '@src/languages/turtle/turtle-document';
import { TurtleFeatureProvider } from '@src/languages/turtle/turtle-feature-provider';

export class TurtlePrefixCompletionProvider extends TurtleFeatureProvider implements vscode.InlineCompletionItemProvider {
	protected readonly prefixTokenTypes = new Set([RdfToken.PREFIX.name, RdfToken.TTL_PREFIX.name]);

	constructor(
		readonly onComplete: (uri: string) => string,
		private readonly _contextService: IDocumentContextService,
		private readonly _prefixLookup: IPrefixLookupService
	) {
		super();
	}

	provideInlineCompletionItems(document: vscode.TextDocument, position: vscode.Position, completion: vscode.InlineCompletionContext, token?: vscode.CancellationToken): vscode.ProviderResult<vscode.InlineCompletionItem[] | vscode.InlineCompletionList> {
		const context = this._contextService.getDocumentContext(document, TurtleDocument);

		// Inline completions are requested (and the previous request cancelled)
		// on essentially every keystroke; skip the full tokenization when the
		// result would be discarded anyway.
		if (!context || token?.isCancellationRequested) {
			return null;
		}

		// Only prefix declarations are completed inline. Checking the current line first
		// avoids tokenizing the document on the keystrokes of every other line.
		if (!this._isPrefixDeclarationLine(document.lineAt(position.line).text)) {
			return null;
		}

		// Tokenize the current document text so that completions are always based on
		// the up-to-date buffer content, also for documents that are not indexed (e.g.
		// untitled documents). The tokens are cached per document version and shared
		// with the other providers that run on the same keystroke.
		const tokens = context.tokenizeDocument(document);

		if (token?.isCancellationRequested) {
			return null;
		}

		const n = getTokenIndexAtPosition(tokens, position);

		// We also need the previous token to determine if this is a prefix definition.
		if (n < 1) {
			return null;
		}

		const currentToken = tokens[n];
		const currentType = currentToken.tokenType.name;

		if (!currentType || currentType !== RdfToken.PNAME_NS.name) {
			return;
		}

		const previousToken = tokens[n - 1];

		if (!previousToken) {
			return null;
		}

		// Only do inline completion for prefix defitions.
		const previousType = previousToken.tokenType.name;

		if (!previousType || !this.prefixTokenTypes.has(previousType)) {
			return null;
		}

		const prefix = currentToken.image.split(":")[0];
		const uri = this._prefixLookup.getUriForPrefix(document.uri.toString(), prefix);

		if (uri) {
			return [{
				insertText: this.onComplete(uri),
				range: new vscode.Range(position, position)
			}];
		} else {
			return [];
		}
	}

	/**
	 * Indicates whether a line may contain a prefix declaration, i.e. the Turtle `@prefix`
	 * or the SPARQL `PREFIX` keyword (case-insensitive). The token check that follows decides
	 * precisely; this only rules out the lines that certainly do not declare a prefix.
	 * @param lineText The text of the line at the cursor.
	 */
	private _isPrefixDeclarationLine(lineText: string): boolean {
		return /(^|\s)@?prefix\s/i.test(lineText);
	}
}