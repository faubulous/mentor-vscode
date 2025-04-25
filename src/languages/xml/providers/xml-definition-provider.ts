import * as vscode from 'vscode';
import { mentor } from '@/mentor';
import { DocumentContext } from '@/document-context';
import { DefinitionProvider } from '@/providers';
import { XmlFeatureProvider } from '@/languages/xml/xml-feature-provider';
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
		const definitions = primaryContext.typeDefinitions[uri];

		if (!definitions || !definitions.length) {
			return null;
		}

		const range = definitions[0];

		return new vscode.Location(primaryContext.uri, new vscode.Range(
			new vscode.Position(range.start.line, range.start.character),
			new vscode.Position(range.end.line, range.end.character)
		));
	}
}