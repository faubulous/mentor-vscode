import * as vscode from 'vscode';
import { mentor } from '@src/mentor';
import { LanguageClientBase, XmlDocument } from '@src/languages';
import { XmlParseResult } from '@src/languages/xml/xml-types';

export class XmlLanguageClient extends LanguageClientBase {
	constructor() {
		super('xml', 'RDF/XML');
	}

	override start(context: vscode.ExtensionContext): void {
		super.start(context);

		if (this.client) {
			this.client.onNotification('mentor.message.updateContext', (params: { languageId: string, uri: string, parsedData: XmlParseResult }) => {
				let documentContext = mentor.contexts[params.uri];

				if (documentContext === undefined) {
					const uri = vscode.Uri.parse(params.uri);

					documentContext = mentor.documentFactory.create(uri, this.languageId);

					mentor.contexts[params.uri] = documentContext;
				}

				if (documentContext instanceof XmlDocument) {
					// Update the document context with the parsed data from the language server.
					documentContext.setParsedData(params.parsedData);

					// Resolve any pending token requests for this document.
					// This allows loadDocument to proceed with triple loading.
					// We pass an empty array since XML doesn't use tokens.
					mentor.resolveTokens(params.uri, []);
				}
			});
		}
	}
}
