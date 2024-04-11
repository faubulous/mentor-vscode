import * as vscode from 'vscode';
import * as mentor from '../mentor';
import { IToken } from "millan";
import { FeatureProvider } from './feature-provider';
import { getUriFromToken, getPrefixFromToken } from '../utilities';
import { DocumentContext } from '../languages';

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

		return this.provideReferencesForToken(context, position, token);
	}

	provideReferencesForToken(context: DocumentContext, position: vscode.Position, token: IToken) {
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

	provideReferencesForUri(uri: string): vscode.Location[] {
		let result: vscode.Location[] = [];

		for (const context of Object.values(mentor.contexts)) {
			// Do not provide references for temporary, non-persisted git diff views or other in-memory documents.
			if (context.isTemporary || !context.references[uri]) {
				continue;
			}

			for (const t of context.references[uri]) {
				result.push(this.getLocationFromToken(context.uri, t));
			}
		}

		return result;
	}
}