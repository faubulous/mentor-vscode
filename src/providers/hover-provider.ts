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

		const uri = context.getUriFromToken(token);

		if (!uri) {
			return null;
		}

		return new vscode.Hover(context.getResourceTooltip(uri));
	}
}
