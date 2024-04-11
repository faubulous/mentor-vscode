import * as vscode from 'vscode';
import * as mentor from '../mentor';
import { DocumentContext } from '../document-context';
import { FeatureProvider } from './feature-provider';
import { getUriFromToken } from '../utilities';

/**
 * Provides resource definitions for Turtle documents.
 */
export class DefinitionProvider extends FeatureProvider {
	provideDefinition(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.Definition> {
		const context = this.getDocumentContext(document);

		if (!context) {
			return null;
		}

		const token = this.getTokensAtPosition(context.tokens, position)[0];

		if (!token) {
			return null;
		}

		let u;

		if (this.isCursorOnPrefix(token, position)) {
			u = context.namespaces[token.image.split(":")[0]];
		} else {
			u = getUriFromToken(context.namespaces, token);
		}

		if (!u) {
			return null;
		}

		// Todo: Search for definitions in this context and then the other documents.
		return this.provideDefintionForUri(context, u);
	}

	provideDefintionForUri(primaryContext: DocumentContext, uri: string, primaryContextOnly: boolean = false): vscode.Definition | null {
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
			} else if (primaryContext.namespaceDefinitions[uri]) {
				token = primaryContext.namespaceDefinitions[uri];
			} else if (primaryContext.references[uri]) {
				token = primaryContext.references[uri][0];
			}
		}

		if (token) {
			const startLine = token.startLine ? token.startLine - 1 : 0;
			const startCharacter = token.startColumn ? token.startColumn - 1 : 0;
			const endLine = token.endLine ? token.endLine - 1 : 0;
			const endCharacter = token.endColumn ?? 0;

			const range = new vscode.Range(startLine, startCharacter, endLine, endCharacter);

			return new vscode.Location(tokenContext.uri, range);
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