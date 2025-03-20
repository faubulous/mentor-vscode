import * as vscode from 'vscode';
import { XmlFeatureProvider } from '../xml-feature-provider';

/**
 * Provides hover information for tokens.
 */
export class XmlHoverProvider extends XmlFeatureProvider implements vscode.HoverProvider {
	provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.Hover> {
		const context = this.getDocumentContext(document);

		if (!context) {
			return null;
		}

		// Find the full attribute (e.g., xml:lang) at the given position
		let iri: string | undefined = this.getIriAtPosition(context, position);

		if (!iri) {
			return null;
		}

		return new vscode.Hover(context.getResourceTooltip(iri));
	}
}
