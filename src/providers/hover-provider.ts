import * as vscode from 'vscode';
import { container, DocumentContextManager } from '@src/container';

/**
 * Provides hover information for tokens.
 */
export class HoverProvider implements vscode.HoverProvider {
	private get contextManager() {
		return container.resolve(DocumentContextManager);
	}

	provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.Hover> {
		const context = this.contextManager.contexts[document.uri.toString()];

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
