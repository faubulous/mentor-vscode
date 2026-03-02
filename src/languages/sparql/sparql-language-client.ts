import * as vscode from 'vscode';
import { IToken } from 'chevrotain';
import { mentor } from '@src/mentor';
import { LanguageClientBase, SparqlDocument } from '@src/languages';

export class SparqlLanguageClient extends LanguageClientBase {
	constructor() {
		super('sparql', 'SPARQL');
	}

	override start(context: vscode.ExtensionContext): void {
		super.start(context);

		if (this.client) {
			this.client.onNotification('mentor.message.updateContext', (params: { languageId: string, uri: string, tokens: IToken[] }) => {
				let documentContext = mentor.contexts[params.uri];

				if (documentContext === undefined) {
					const uri = vscode.Uri.parse(params.uri);

					documentContext = mentor.documentFactory.create(uri, this.languageId);

					mentor.contexts[params.uri] = documentContext;
				}

				if (documentContext instanceof SparqlDocument) {
					// Update the document context with the new tokens.
					documentContext.setTokens(params.tokens);

					// Resolve any pending token requests for this document.
					// This allows loadDocument to proceed with triple loading.
					mentor.resolveTokens(params.uri, params.tokens);
				}
			});
		}
	}
}
