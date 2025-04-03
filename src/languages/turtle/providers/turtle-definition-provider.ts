import * as vscode from 'vscode';
import { mentor } from '@/mentor';
import { DocumentContext } from '@/document-context';
import { getIriFromToken } from '@/utilities';
import { TurtleFeatureProvider } from '@/languages/turtle/turtle-feature-provider';
import { TurtleDocument } from '../turtle-document';

/**
 * Provides resource definitions for Turtle documents.
 */
export class TurtleDefinitionProvider extends TurtleFeatureProvider {
	provideDefinition(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.Definition> {
		const context = mentor.getDocumentContext(document, TurtleDocument);

		if (!context) {
			return null;
		}

		const token = context.getTokensAtPosition(position)[0];

		if (!token) {
			return null;
		}

		let u;

		if (this.isCursorOnPrefix(token, position)) {
			u = context.namespaces[token.image.split(":")[0]];
		} else {
			u = getIriFromToken(context.namespaces, token);
		}

		if (!u) {
			return null;
		}

		// TODO: Search for definitions in this context and then the other documents. Currently it only provides definitions from the primary document.
		return this.provideDefinitionForIri(context, u);
	}

	provideDefinitionForIri(primaryContext: DocumentContext, uri: string, primaryContextOnly: boolean = false): vscode.Definition | null {
		let range;
		let context = primaryContext;

		if (!primaryContextOnly) {
			// Find all contexts that define the URI.
			const contexts = this._getContextsDefiningUri(uri, primaryContext);

			for (let c of contexts.filter(c => c.typeDefinitions[uri])) {
				// Look for type assertions first, because sometimes namespaces are defined as rdf:type owl:Ontology.
				range = c.typeDefinitions[uri][0];
				context = c;

				break;
			}
		}

		// If no class or property definition was found, look for namespace definitions or references in the primary document.
		if (!range) {
			if (primaryContext.typeDefinitions[uri]) {
				range = primaryContext.typeDefinitions[uri][0];
			} else if (primaryContext.typeAssertions[uri]) {
				range = primaryContext.typeAssertions[uri][0];
			} else if (primaryContext.namespaceDefinitions[uri]) {
				range = primaryContext.namespaceDefinitions[uri];
			} else if (primaryContext.references[uri]) {
				range = primaryContext.references[uri][0];
			}
		}

		if (range) {
			return new vscode.Location(context.uri, new vscode.Range(range.start.line, range.start.character, range.end.line, range.end.character));
		}

		return null;
	}

	private _getContextsDefiningUri(uri: string, primaryContext?: DocumentContext): DocumentContext[] {
		const result: DocumentContext[] = [];
		const contexts = Object.values(mentor.contexts);

		for (const c of contexts.filter(c => c.typeDefinitions[uri])) {
			if (primaryContext && c == primaryContext) {
				result.unshift(c);
			} else {
				result.push(c);
			}
		}

		return result;
	}
}