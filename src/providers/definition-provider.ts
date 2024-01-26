import * as vscode from 'vscode';
import { DocumentContext } from '../document-context';
import { FeatureProvider } from './feature-provider';

/**
 * Provides resource definitions for Turtle documents.
 */
export class DefinitionProvider extends FeatureProvider {
	public provideDefinition(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.Definition> {
		const context = this.getDocumentContext(document);

		if(!context) {
			return null;
		}

		const token = context.getTokensAtPosition(position)[0];

		if (!token) {
			return null;
		}

		let u;

		if (context.isCursorOnPrefix(token, position)) {
			u = context.namespaces[token.image.split(":")[0]];
		} else {
			u = context.getUriFromToken(token);
		}

		if (!u) {
			return null;
		}

		return this.provideDefintionForUri(context, u);
	}

	public provideDefintionForUri(context: DocumentContext, uri: string): vscode.Definition | null {
		let t;

		if (context.namespaceDefinitions[uri]) {
			t = context.namespaceDefinitions[uri];
		} else if (context.typeAssertions[uri]) {
			t = context.typeAssertions[uri][0];
		} else if (context.references[uri]) {
			t = context.references[uri][0];
		} else {
			return null;
		}

		const startLine = t.startLine ? t.startLine - 1 : 0;
		const startCharacter = t.startColumn ? t.startColumn - 1 : 0;
		const endLine = t.endLine ? t.endLine - 1 : 0;
		const endCharacter = t.endColumn ?? 0;

		const range = new vscode.Range(startLine, startCharacter, endLine, endCharacter);

		return new vscode.Location(context.document.uri, range);
	}
}