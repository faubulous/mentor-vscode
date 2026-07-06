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

	provideInlineCompletionItems(document: vscode.TextDocument, position: vscode.Position, completion: vscode.InlineCompletionContext): vscode.ProviderResult<vscode.InlineCompletionItem[] | vscode.InlineCompletionList> {
		const context = this._contextService.getDocumentContext(document, TurtleDocument);

		if (!context) {
			return null;
		}

		// Tokenize the current document text synchronously so that completions
		// are always based on the up-to-date buffer content. This avoids waiting
		// for token delivery from the language server and also makes completions
		// work for documents that are not eagerly indexed (e.g. untitled documents).
		const tokens = context.tokenize(document.getText());

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
}