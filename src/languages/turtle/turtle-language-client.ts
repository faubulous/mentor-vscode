import * as vscode from 'vscode';
import { IToken } from 'millan';
import { mentor } from '@src/mentor';
import { LanguageClientBase, TurtleDocument } from '@src/languages';

export class TurtleLanguageClient extends LanguageClientBase {
	constructor(languageId = 'turtle', languageName = 'Turtle') {
		super(languageId, languageName);
	}

	override start(context: vscode.ExtensionContext): void {
		super.start(context);

		if (this.client) {
			this.client.onNotification('mentor/updateContext', (params: { languageId: string, uri: string, tokens: IToken[] }) => {
				let context = mentor.contexts[params.uri];

				if (context === undefined) {
					const uri = vscode.Uri.parse(params.uri);

					context = mentor.documentFactory.create(uri, this.languageId);

					mentor.contexts[params.uri] = context
				}

				// Note: TriG is also handled by the TurtleDocument class.
				if (context instanceof TurtleDocument) {
					// Update the document context with the new tokens.
					context.setTokens(params.tokens);

					// Map the blank nodes in the document to the ones in the triple store.
					context.mapBlankNodes();
				}
			});
		}
	}
}
