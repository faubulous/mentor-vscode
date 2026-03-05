import * as vscode from 'vscode';
import { IToken } from 'chevrotain';
import { container, DocumentContextManager, DocumentFactory } from '@src/container';
import { LanguageClientBase, TurtleDocument } from '@src/languages';

export class TurtleLanguageClient extends LanguageClientBase {
	private get contextManager() {
		return container.resolve(DocumentContextManager);
	}

	private get documentFactory() {
		return container.resolve(DocumentFactory);
	}

	constructor(languageId = 'turtle', languageName = 'Turtle') {
		super(languageId, languageName);
	}

	override start(context: vscode.ExtensionContext): void {
		super.start(context);

		if (this.client) {
			this.client.onNotification('mentor.message.updateContext', (params: { languageId: string, uri: string, tokens: IToken[] }) => {
				let documentContext = this.contextManager.contexts[params.uri];

				if (documentContext === undefined) {
					const uri = vscode.Uri.parse(params.uri);

					documentContext = this.documentFactory.create(uri, this.languageId);

					this.contextManager.contexts[params.uri] = documentContext;
				}

				// Note: TriG is also handled by the TurtleDocument class.
				if (documentContext instanceof TurtleDocument) {
					// Update the document context with the new tokens.
					documentContext.setTokens(params.tokens);

					// Resolve any pending token requests for this document.
					// This allows loadDocument to proceed with triple loading.
					this.contextManager.resolveTokens(params.uri, params.tokens);
				}
			});
		}
	}
}
