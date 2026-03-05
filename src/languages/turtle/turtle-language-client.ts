import * as vscode from 'vscode';
import { IToken } from 'chevrotain';
import { container, DocumentContextService, DocumentFactory } from '@src/container';
import { InjectionToken } from '@src/injection-token';
import { LanguageClientBase, TurtleDocument } from '@src/languages';

export class TurtleLanguageClient extends LanguageClientBase {
	private get contextService() {
		return container.resolve<DocumentContextService>(InjectionToken.DocumentContextService);
	}

	private get documentFactory() {
		return container.resolve<DocumentFactory>(InjectionToken.DocumentFactory);
	}

	constructor(languageId = 'turtle', languageName = 'Turtle') {
		super(languageId, languageName);
	}

	override start(context: vscode.ExtensionContext): void {
		super.start(context);

		if (this.client) {
			this.client.onNotification('mentor.message.updateContext', (params: { languageId: string, uri: string, tokens: IToken[] }) => {
				let documentContext = this.contextService.contexts[params.uri];

				if (documentContext === undefined) {
					const uri = vscode.Uri.parse(params.uri);

					documentContext = this.documentFactory.create(uri, this.languageId);

					this.contextService.contexts[params.uri] = documentContext;
				}

				// Note: TriG is also handled by the TurtleDocument class.
				if (documentContext instanceof TurtleDocument) {
					// Update the document context with the new tokens.
					documentContext.setTokens(params.tokens);

					// Resolve any pending token requests for this document.
					// This allows loadDocument to proceed with triple loading.
					this.contextService.resolveTokens(params.uri, params.tokens);
				}
			});
		}
	}
}
