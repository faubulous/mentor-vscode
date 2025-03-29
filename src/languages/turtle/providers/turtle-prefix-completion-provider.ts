import * as vscode from 'vscode';
import { mentor } from '@/mentor';
import { getPreviousToken } from '@/utilities';
import { TurtleFeatureProvider } from '@/languages/turtle/turtle-feature-provider';
import { TurtleDocument } from '../turtle-document';

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

		const currentToken = context.getTokensAtPosition(position)[0];

		if (!currentToken) {
			return null;
		}

		const currentType = currentToken.tokenType?.tokenName;

		if (!currentType || currentType != "PNAME_NS") {
			return;
		}

		const previousToken = getPreviousToken(context.tokens, currentToken);

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