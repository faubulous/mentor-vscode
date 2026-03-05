import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/token';
import { IDocumentContextService } from '@src/services/interfaces';

/**
 * Provides hover information for tokens.
 */
export class HoverProvider implements vscode.HoverProvider {
	private get contextService() {
		return container.resolve<IDocumentContextService>(ServiceToken.DocumentContextService);
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
