import * as vscode from 'vscode';
import { mentor } from '@/mentor';
import { DocumentContext } from '@/document-context';
import { getIriFromToken } from '@/utilities';
import { TurtleFeatureProvider } from '@/languages/turtle/turtle-feature-provider';

/**
 * Provides resource definitions for Turtle documents.
 */
export class TurtleDefinitionProvider extends TurtleFeatureProvider {
	provideDefinition(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.Definition> {
		const context = this.getDocumentContext(document);

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
		let token;
		let tokenContext = primaryContext;

		if (!primaryContextOnly) {
			// Find all contexts that define the URI.
			const contexts = this._getContextsDefiningUri(uri, primaryContext);

			for (let c of contexts.filter(c => c.typeDefinitions[uri])) {
				// Look for type assertions first, because sometimes namespaces are defined as rdf:type owl:Ontology.
				token = c.typeDefinitions[uri][0];
				tokenContext = c;

				break;
			}
		}

		// If no class or property definition was found, look for namespace definitions or references in the primary document.
		if (!token) {
			if (primaryContext.typeDefinitions[uri]) {
				token = primaryContext.typeDefinitions[uri][0];
			} else if(primaryContext.typeAssertions[uri]) {
				token = primaryContext.typeAssertions[uri][0];
			} else if (primaryContext.namespaceDefinitions[uri]) {
				token = primaryContext.namespaceDefinitions[uri];
			} else if (primaryContext.references[uri]) {
				token = primaryContext.references[uri][0];
			}
		}

		if (token) {
			return new vscode.Location(tokenContext.uri, this.getRangeFromToken(token));
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