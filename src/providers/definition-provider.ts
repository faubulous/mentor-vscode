import * as vscode from 'vscode';
import { DocumentContext, mentor } from '../mentor';
import { IToken } from 'chevrotain';
import { getNamespaceUri } from '../utilities';

interface TokenPosition {
	startLine: number;
	startColumn: number;
	endLine: number;
	endColumn: number;
}

export class DefinitionProvider implements vscode.DefinitionProvider {
	private _getTokenPosition(token: IToken): TokenPosition {
		return {
			startLine: token.startLine ? token.startLine - 1 : 0,
			startColumn: token.startColumn ? token.startColumn - 1 : 0,
			endLine: token.endLine ? token.endLine - 1 : 0,
			endColumn: token.endColumn ? token.endColumn : 0
		};
	}

	private _isCursorOnPrefix(token: IToken, position: vscode.Position) {
		const tokenType = token.tokenType?.tokenName;
		const p = this._getTokenPosition(token);

		switch (tokenType) {
			case "PNAME_NS":
			case "PNAME_LN": {
				const i = token.image.indexOf(":");
				const n = position.character - p.startColumn;

				return n <= i;
			}
			default: {
				return false;
			}
		}
	}

	private _getLabelEditRange(token: IToken) {
		const tokenType = token.tokenType?.tokenName;
		const p = this._getTokenPosition(token);

		switch (tokenType) {
			case "PNAME_LN": {
				const i = token.image.indexOf(":");

				return new vscode.Range(
					new vscode.Position(p.startLine, p.startColumn + i + 1),
					new vscode.Position(p.endLine, p.endColumn)
				);
			}
			case "IRIREF": {
				let uri = token.image.trim();
				uri = uri.substring(1, uri.length - 1)

				const namespace = getNamespaceUri(uri);
				const label = uri.substring(namespace.length);

				const i = token.image.indexOf(label);

				return new vscode.Range(
					new vscode.Position(p.startLine, p.startColumn + i),
					new vscode.Position(p.endLine, p.startColumn + i + label.length)
				);
			}
			case "VAR1": {
				return new vscode.Range(
					new vscode.Position(p.startLine, p.startColumn + 1),
					new vscode.Position(p.endLine, p.endColumn)
				);
			}
			default: {
				return null;
			}
		}
	}

	public provideDefinition(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.Definition> {
		const uri = document.uri.toString();

		if (!mentor.contexts[uri]) {
			return null;
		}

		const context = mentor.contexts[uri];
		const token = context.getTokensAtPosition(position)[0];

		if (!token) {
			return null;
		}

		let u;

		if (this._isCursorOnPrefix(token, position)) {
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
			t = context.references[uri][0];
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