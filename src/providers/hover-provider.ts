import * as vscode from 'vscode';
import { FeatureProvider } from './feature-provider';

/**
 * Provides hover information for tokens.
 */
export class HoverProvider extends FeatureProvider implements vscode.HoverProvider {
	provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.Hover> {
		const context = this.getDocumentContext(document);

		if (!context) {
			return null;
		}

		const token = context.getTokensAtPosition(position)[0];

		if (!token) {
			return null;
		}

		const t = token.tokenType?.name;

		switch(t) {
			// Display the literal strings without the quotes for improved readability for long strings.
			case 'STRING_LITERAL_QUOTE': {
				return new vscode.Hover(token.image.slice(1, -1));
			}
			case 'STRING_LITERAL_LONG_QUOTE': {
				return new vscode.Hover(token.image.slice(3, -3));
			}
			// Display a the description for the concept for URIs, if it exists.
			default: {
				const uri = context.getUriFromToken(token);

				if (!uri) {
					return null;
				}
	
				return new vscode.Hover(context.getResourceTooltip(uri));
			}
		}
	}
}
