import * as vscode from 'vscode';
import { FeatureProvider } from './feature-provider';
import { PrefixLookupService } from '../services/prefix-lookup-service';
import { getPreviousToken } from '../utilities';

export class PrefixCompletionProvider extends FeatureProvider implements vscode.InlineCompletionItemProvider {
	protected readonly prefixLookupService = new PrefixLookupService();

	protected readonly prefixTokenTypes = new Set(["PREFIX", "TTL_PREFIX"]);

	provideInlineCompletionItems(document: vscode.TextDocument, position: vscode.Position, completion: vscode.InlineCompletionContext): vscode.ProviderResult<vscode.InlineCompletionItem[] | vscode.InlineCompletionList> {
		const context = this.getDocumentContext(document);

		if (!context) {
			return null;
		}

		const currentToken = this.getTokensAtPosition(context.tokens, position)[0];

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
		const uri = this.prefixLookupService.getUriForPrefix(prefix);

		if (uri) {
			return [{
				insertText: ` <${uri}> .`,
				range: new vscode.Range(position, position)
			}];
		} else {
			return [];
		}
	}
}