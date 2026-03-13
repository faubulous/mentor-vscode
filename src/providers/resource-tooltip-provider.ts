import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { IDocumentContextService } from '@src/services/document';

/**
 * Provides hover information for tokens.
 */
export class ResourceTooltipProvider implements vscode.HoverProvider {
	private get _contextService() {
		return container.resolve<IDocumentContextService>(ServiceToken.DocumentContextService);
	}

	provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.Hover> {
		const context = this._contextService.contexts[document.uri.toString()];

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
