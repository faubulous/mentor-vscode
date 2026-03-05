import * as vscode from 'vscode';
import { IToken } from 'chevrotain';
import { container, DocumentFactory, IDocumentContextService } from '@src/services/service-container';
import { ServiceToken } from '@src/services';
import { LanguageClientBase, SparqlDocument } from '@src/languages';

export class SparqlLanguageClient extends LanguageClientBase {
	private get contextService() {
		return container.resolve<IDocumentContextService>(ServiceToken.DocumentContextService);
	}

	private get documentFactory() {
		return container.resolve<DocumentFactory>(ServiceToken.DocumentFactory);
	}

	constructor() {
		super('sparql', 'SPARQL');
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

				if (documentContext instanceof SparqlDocument) {
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
