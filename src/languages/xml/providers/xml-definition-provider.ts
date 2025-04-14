import * as vscode from 'vscode';
import { mentor } from '@/mentor';
import { DocumentContext } from '@/document-context';
import { DefinitionProvider } from '@/languages/definition-provider';
import { XmlFeatureProvider } from '@/languages/xml/xml-feature-provider';
import { getIriLocalPart } from '@/utilities';
import { XmlDocument } from '../xml-document';

/**
 * Provides resource definitions for RDF/XML documents.
 */
export class XmlDefinitionProvider extends XmlFeatureProvider implements DefinitionProvider {
	provideDefinition(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.Definition> {
		const context = mentor.getDocumentContext(document, XmlDocument)

		if (!context) {
			return null;
		}

		const iri = this.getIriAtPosition(document, position);

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
		const document = context.getTextDocument();

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
			let length = aboutIri.length;

			if (i === -1 && aboutLocalName) {
				i = line.indexOf(aboutLocalName);
				length = aboutLocalName.length;
			}

			if (i !== -1) {
				const start = new vscode.Position(n, i + 'rdf:about="'.length);
				const end = new vscode.Position(n, i + length - '\"'.length);

				return new vscode.Range(start, end);
			}
		}

		return null;
	}
}