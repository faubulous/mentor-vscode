import * as vscode from 'vscode';
import { mentor } from '../mentor';
import { IToken } from 'chevrotain';
import { getNamespaceUri } from '../utilities';

interface TokenPosition {
	startLine: number;
	startColumn: number;
	endLine: number;
	endColumn: number;
}

// See: https://www.programcreek.com/typescript/prettier.io/?api=vscode.RenameProvider
export class RenameProvider implements vscode.RenameProvider {
	private _getTokenPosition(token: IToken): TokenPosition {
		return {
			startLine: token.startLine ? token.startLine - 1 : 0,
			startColumn: token.startColumn ? token.startColumn - 1 : 0,
			endLine: token.endLine ? token.endLine - 1 : 0,
			endColumn: token.endColumn ? token.endColumn : 0
		};
	}

	private _isRenamingVariable(token: IToken) {
		const tokenType = token.tokenType?.tokenName;

		return tokenType === "VAR1";
	}

	private _isRenamingPrefix(token: IToken, position: vscode.Position) {
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

	private _getPrefixEditRange(token: IToken) {
		const tokenType = token.tokenType?.tokenName;
		const p = this._getTokenPosition(token);

		switch (tokenType) {
			case "PNAME_NS":
			case "PNAME_LN": {
				const i = token.image.indexOf(":");

				return new vscode.Range(
					new vscode.Position(p.startLine, p.startColumn),
					new vscode.Position(p.startLine, p.startColumn + i)
				);
			}
			default: {
				return null;
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

	public async prepareRename(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.Range | null> {
		const uri = document.uri.toString();

		if (!mentor.contexts[uri]) {
			throw new Error('Rename is not available without a valid document context.');
		}

		const context = mentor.contexts[uri];
		const token = context.getTokensAtPosition(position)[0];

		if (!token) {
			throw new Error('No token found at the given position.');
		}

		if (this._isRenamingPrefix(token, position)) {
			return this._getPrefixEditRange(token);
		} else {
			return this._getLabelEditRange(token);
		}
	}

	public provideRenameEdits(document: vscode.TextDocument, position: vscode.Position, newName: string): vscode.ProviderResult<vscode.WorkspaceEdit> {
		const edits = new vscode.WorkspaceEdit();
		const uri = document.uri.toString();

		if (!mentor.contexts[uri]) {
			return edits;
		}

		const context = mentor.contexts[uri];
		const token = context.getTokensAtPosition(position)[0];

		if (!token) {
			return edits;
		}

		if (this._isRenamingPrefix(token, position)) {
			const i = token.image.indexOf(":");
			const prefix = token.image.substring(0, i);

			for (const t of context.tokens) {
				const tokenType = t.tokenType?.tokenName;

				switch (tokenType) {
					case "PNAME_NS":
					case "PNAME_LN": {
						const p = t.image.split(":")[0];

						if (p === prefix) {
							const r = this._getPrefixEditRange(t);

							if (!r) continue;

							edits.replace(document.uri, r, newName);
						}

						break;
					}
				}
			}

			if (edits.size > 0) {
				context.updateNamespacePrefix(prefix, newName);
			}
		} else if (this._isRenamingVariable(token)) {			
			for (const t of context.tokens.filter(t => t.image === token.image)) {
				const r = this._getLabelEditRange(t);

				if (!r) continue;

				edits.replace(document.uri, r, newName);
			}
		} else {
			const u = context.getUriFromToken(token);

			if (u && context.references[u]) {
				for (const r of context.references[u].map(t => this._getLabelEditRange(t))) {
					if (!r) continue;

					edits.replace(document.uri, r, newName);
				}
			}
		}

		return edits;
	}
}