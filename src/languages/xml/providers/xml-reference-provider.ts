import * as vscode from 'vscode';
import { mentor } from '@/mentor';
import { XmlFeatureProvider } from '@/languages/xml/xml-feature-provider';
import { XmlDocument } from '../xml-document';

/**
 * Provides references to resources.
 */
export class XmlReferenceProvider extends XmlFeatureProvider implements vscode.ReferenceProvider {
	provideReferences(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.Location[]> {
		const context = mentor.getDocumentContext(document, XmlDocument)

		if (!context) {
			return null;
		}

		const iri = context.getIriAtPosition(document, position);

		if (!iri) {
			return null;
		}

		return this.provideReferencesForIri(iri);
	}

	provideReferencesForIri(iri: string): vscode.Location[] {
		let result: vscode.Location[] = [];

		for (const context of Object.values(mentor.contexts)) {
			// Do not provide references for temporary, non-persisted git diff views or other in-memory documents.
			if (context.isTemporary || !context.references[iri]) {
				continue;
			}

			for (const range of context.references[iri]) {
				const r = new vscode.Range(range.start.line, range.start.character, range.end.line, range.end.character);

				result.push(new vscode.Location(context.uri, r));
			}
		}

		return result;
	}
}