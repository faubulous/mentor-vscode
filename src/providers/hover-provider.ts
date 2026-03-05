import * as vscode from 'vscode';
import { container, DocumentContextService } from '@src/service-container';
import { ServiceToken } from '@src/service-token';

/**
 * Provides hover information for tokens.
 */
export class HoverProvider implements vscode.HoverProvider {
	private get contextService() {
		return container.resolve<DocumentContextService>(ServiceToken.DocumentContextService);
	}

	provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.Hover> {
		const context = this.contextService.contexts[document.uri.toString()];

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
