import * as vscode from 'vscode';
import { mentor } from '@src/mentor';
import { TurtleDocument } from '@src/languages/turtle/turtle-document';
import { TurtleFeatureProvider } from '@src/languages/turtle/turtle-feature-provider';

export class TurtlePrefixCompletionProvider extends TurtleFeatureProvider implements vscode.InlineCompletionItemProvider {
	protected readonly prefixTokenTypes = new Set(["PREFIX", "TTL_PREFIX"]);

	constructor(readonly onComplete: (uri: string) => string) {
		super();
	}

	provideInlineCompletionItems(document: vscode.TextDocument, position: vscode.Position, completion: vscode.InlineCompletionContext): vscode.ProviderResult<vscode.InlineCompletionItem[] | vscode.InlineCompletionList> {
		const context = mentor.getDocumentContext(document, TurtleDocument);

		if (!context) {
			return null;
		}

		const n = context.getTokenIndexAtPosition(position);

		// We also need the previous token to determine if this is a prefix definition.
		if (n < 1) {
			return null;
		}

		const currentToken = context.tokens[n];
		const currentType = currentToken.tokenType?.tokenName;

		if (!currentType || currentType != "PNAME_NS") {
			return;
		}

		const previousToken = context.tokens[n - 1];

		if (!previousToken) {
			return null;
		}

		// Only do inline completion for prefix defitions.
		const previousType = previousToken.tokenType?.tokenName;

		if (!previousType || !this.prefixTokenTypes.has(previousType)) {
			return null;
		}

		const prefix = currentToken.image.split(":")[0];
		const uri = mentor.prefixLookupService.getUriForPrefix(document.uri.toString(), prefix);

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