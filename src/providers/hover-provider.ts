import * as vscode from 'vscode';
import { mentor } from '@/mentor';

/**
 * Provides hover information for tokens.
 */
export class HoverProvider implements vscode.HoverProvider {
	provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.Hover> {
		const context = mentor.contexts[document.uri.toString()];

		if (!context) {
			return null;
		}

		const iri = context.getIriAtPosition(position);

		if (iri) {
			return new vscode.Hover(context.getResourceTooltip(iri));
		}

		const literalValue = context.getLiteralAtPosition(position);

		if (literalValue) {
			return new vscode.Hover(literalValue);
		}

		return null;
	}
}
