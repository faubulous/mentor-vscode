import * as vscode from 'vscode';
import { IToken } from 'chevrotain';
import { DocumentContext } from '../languages/document-context';
import { FeatureProvider } from './feature-provider';
import { getUriFromToken, getPrefixFromToken } from '../utilities';

/**
 * Provides references to resources.
 */
export class ReferenceProvider extends FeatureProvider implements vscode.ReferenceProvider {
	provideReferences(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.Location[]> {
		const context = this.getDocumentContext(document);

		if (!context) {
			return null;
		}

		const token = this.getTokensAtPosition(context.tokens, position)[0];

		if (!token) {
			return null;
		}

		let u;

		if (this.isCursorOnPrefix(token, position)) {
			u = context.namespaces[getPrefixFromToken(token)];
		} else {
			u = getUriFromToken(context.namespaces, token);
		}

		if (!u) {
			return null;
		}

		return this.provideReferencesForUri(context, u);
	}

	public provideReferencesForUri(context: DocumentContext, uri: string): vscode.Location[] | null {
		let tokens: IToken[];

		if (context.references[uri]) {
			tokens = context.references[uri];
		} else {
			return null;
		}

		return tokens.map(t => this.getLocationFromToken(context.document, t));
	}
}