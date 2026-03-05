import * as vscode from 'vscode';
import { TOKENS } from '@faubulous/mentor-rdf-parsers';
import { container, IDocumentContextService, IPrefixLookupService } from '@src/services/service-container';
import { ServiceToken } from '@src/services';
import { TurtleDocument } from '@src/languages/turtle/turtle-document';
import { TurtleFeatureProvider } from '@src/languages/turtle/turtle-feature-provider';

export class TurtlePrefixCompletionProvider extends TurtleFeatureProvider implements vscode.InlineCompletionItemProvider {
	protected readonly prefixTokenTypes = new Set([TOKENS.PREFIX.name, TOKENS.TTL_PREFIX.name]);

	private get contextService() {
		return container.resolve<IDocumentContextService>(ServiceToken.DocumentContextService);
	}

	constructor(readonly onComplete: (uri: string) => string) {
		super();
	}

	provideInlineCompletionItems(document: vscode.TextDocument, position: vscode.Position, completion: vscode.InlineCompletionContext): vscode.ProviderResult<vscode.InlineCompletionItem[] | vscode.InlineCompletionList> {
		const context = this.contextService.getDocumentContext(document, TurtleDocument);

		if (!context) {
			return null;
		}

		const n = context.getTokenIndexAtPosition(position);

		// We also need the previous token to determine if this is a prefix definition.
		if (n < 1) {
			return null;
		}

		const currentToken = context.tokens[n];
		const currentType = currentToken.tokenType.name;

		if (!currentType || currentType !== TOKENS.PNAME_NS.name) {
			return;
		}

		const previousToken = context.tokens[n - 1];

		if (!previousToken) {
			return null;
		}

		// Only do inline completion for prefix defitions.
		const previousType = previousToken.tokenType.name;

		if (!previousType || !this.prefixTokenTypes.has(previousType)) {
			return null;
		}

		const prefix = currentToken.image.split(":")[0];
		const prefixLookup = container.resolve<IPrefixLookupService>(ServiceToken.PrefixLookupService);
		const uri = prefixLookup.getUriForPrefix(document.uri.toString(), prefix);

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