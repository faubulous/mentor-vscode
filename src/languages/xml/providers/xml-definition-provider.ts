import * as vscode from 'vscode';
import { DocumentContext } from '@/document-context';
import { DefinitionProvider } from '@/languages/definition-provider';
import { XmlFeatureProvider } from '@/languages/xml/xml-feature-provider';
import { getIriLocalPart } from '@/utilities';

/**
 * Provides resource definitions for Turtle documents.
 */
export class XmlDefinitionProvider extends XmlFeatureProvider implements DefinitionProvider {
	provideDefinition(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.Definition> {
		const context = this.getDocumentContext(document);

		if (!context) {
			return null;
		}

		let iri = this.getIriAtPosition(context, position);

		if (iri) {
			return this.provideDefinitionForIri(context, iri);
		}
	}

	provideDefinitionForIri(primaryContext: DocumentContext, uri: string, primaryContextOnly: boolean = false): vscode.Definition | null {
		const location = this._findSubject(primaryContext, uri);

		if (!location) {
			return null;
		}

		return new vscode.Location(primaryContext.uri, location);
	}

	/**
	 * Finds the text `rdf:about="someUri"` in the document by iterating over its lines.
	 * @param document The text document to search in.
	 * @param uri The URI to search for.
	 * @returns The range of the match or null if not found.
	 */
	private _findSubject(context: DocumentContext, uri: string): vscode.Range | null {
		const document = this.getTextDocument(context.uri);

		if (!document) {
			return null;
		}

		const localName = getIriLocalPart(uri);

		let aboutLocalName = undefined;

		if (context.baseIri && context.baseIri + localName === uri) {
			aboutLocalName = `rdf:about="${localName}"`;
		}

		const aboutIri = `rdf:about="${uri}"`;

		for (let n = 0; n < document.lineCount; n++) {
			const line = document.lineAt(n).text;

			let i = line.indexOf(aboutIri);

			if (i === -1 && aboutLocalName) {
				i = line.indexOf(aboutLocalName);
			}

			if (i !== -1) {
				const start = new vscode.Position(n, i);
				const end = new vscode.Position(n, i + aboutIri.length);

				return new vscode.Range(start, end);
			}
		}

		return null;
	}
}