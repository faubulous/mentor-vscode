import * as vscode from 'vscode';
import { mentor } from '@/mentor';
import { XmlFeatureProvider } from '@/languages/xml/xml-feature-provider';
import { XmlDocument } from '../xml-document';

/**
 * Provides hover information for text under the cursor.
 */
export class XmlHoverProvider extends XmlFeatureProvider implements vscode.HoverProvider {
	provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.Hover> {
		const context = mentor.getDocumentContext(document, XmlDocument)

		if (!context) {
			return null;
		}

		const iri = this.getIriAtPosition(document, position);

		if (!iri) {
			return null;
		}

		return new vscode.Hover(context.getResourceTooltip(iri));
	}
}
