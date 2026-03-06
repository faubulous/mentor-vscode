import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { IDocumentContextService } from '@src/services/interfaces';
import { LanguageClientBase, XmlDocument } from '@src/languages';
import { XmlParseResult } from '@src/languages/xml/xml-types';
import { DocumentFactory } from '@src/workspace/document-factory';

export class XmlLanguageClient extends LanguageClientBase {
	private get contextService() {
		return container.resolve<IDocumentContextService>(ServiceToken.DocumentContextService);
	}

	private get documentFactory() {
		return container.resolve<DocumentFactory>(ServiceToken.DocumentFactory);
	}

	constructor() {
		super('xml', 'RDF/XML');
	}

	override start(context: vscode.ExtensionContext): void {
		super.start(context);

		if (this.client) {
			this.client.onNotification('mentor.message.updateContext', (params: { languageId: string, uri: string, parsedData: XmlParseResult }) => {
				let documentContext = this.contextService.contexts[params.uri];

				if (documentContext === undefined) {
					const uri = vscode.Uri.parse(params.uri);

					documentContext = this.documentFactory.create(uri, this.languageId);

					this.contextService.contexts[params.uri] = documentContext;
				}

				if (documentContext instanceof XmlDocument) {
					// Update the document context with the parsed data from the language server.
					documentContext.setParsedData(params.parsedData);

					// Resolve any pending token requests for this document.
					// This allows loadDocument to proceed with triple loading.
					// We pass an empty array since XML doesn't use tokens.
					this.contextService.resolveTokens(params.uri, []);
				}
			});
		}
	}
}
