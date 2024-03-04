import * as vscode from 'vscode';
import * as mentor from '../mentor';
import { IToken } from 'chevrotain';
import { DocumentContext } from '../document-context';
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

		return this.provideReferencesForUri(u);
	}

	public provideReferencesForUri(uri: string): vscode.Location[] | null {
		let result: vscode.Location[] = [];

		for (const context of Object.values(mentor.contexts)) {
			if (!context.references[uri]) {
				continue;
			}

			for (const t of context.references[uri]) {
				result.push(this.getLocationFromToken(context.document, t));
			}
		}

		return result;
	}
}