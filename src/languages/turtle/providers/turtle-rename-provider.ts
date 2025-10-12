import * as vscode from 'vscode';
import { mentor } from '@src/mentor';
import { isVariable, getIriFromToken } from '@src/utilities';
import { TurtleDocument } from '@src/languages/turtle/turtle-document';
import { TurtleFeatureProvider } from '@src/languages/turtle/turtle-feature-provider';

/**
 * Provides renaming for URIs, resources labels and prefixes.
 */
export class TurtleRenameProvider extends TurtleFeatureProvider implements vscode.RenameProvider {
	public async prepareRename(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.Range | null> {
		const context = mentor.getDocumentContext(document, TurtleDocument);

		if (!context) {
			return null;
		}

		const token = context.getTokenAtPosition(position);

		if (!token) {
			throw new Error('No token found at the given position.');
		}

		if (context.isPrefixTokenAtPosition(token, position)) {
			return this.getPrefixEditRange(token);
		} else {
			return this.getLabelEditRange(token);
		}
	}

	public provideRenameEdits(document: vscode.TextDocument, position: vscode.Position, newName: string): vscode.ProviderResult<vscode.WorkspaceEdit> {
		const edits = new vscode.WorkspaceEdit();
		const context = mentor.getDocumentContext(document, TurtleDocument);

		if (!context) {
			return edits;
		}

		const token = context.getTokenAtPosition(position);

		if (!token) {
			return edits;
		}

		if (context.isPrefixTokenAtPosition(token, position)) {
			const i = token.image.indexOf(":");
			const prefix = token.image.substring(0, i);

			for (const t of context.tokens) {
				const tokenType = t.tokenType?.tokenName;

				switch (tokenType) {
					case "PNAME_NS":
					case "PNAME_LN": {
						const p = t.image.split(":")[0];

						if (p === prefix) {
							const r = this.getPrefixEditRange(t);

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
		} else if (isVariable(token)) {
			for (const t of context.tokens.filter(t => t.image === token.image)) {
				const r = this.getLabelEditRange(t);

				if (!r) continue;

				edits.replace(document.uri, r, newName);
			}
		} else {
			const u = getIriFromToken(context.namespaces, token);

			if (!u) return edits;

			const references = context.references[u];

			if (!references) return edits;

			for (let range of references) {
				const token = context.getTokenAtPosition(range.start);

				if (!token) continue;

				const editRange = this.getLabelEditRange(token);

				if (!editRange) continue;

				edits.replace(document.uri, editRange, newName);
			}
		}

		return edits;
	}
}