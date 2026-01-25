import * as vscode from 'vscode';

/**
 * Provides renaming for Datalog symbols including: Relations (predicates), Variables (uppercase identifiers) and Prefixed names (e.g., rdf:type)
 */
export class DatalogRenameProvider implements vscode.RenameProvider {
	/**
	 * Prepares the rename operation by determining the range of the symbol to rename.
	 */
	public async prepareRename(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.Range | { range: vscode.Range; placeholder: string } | null> {
		const wordRange = document.getWordRangeAtPosition(position, /[a-zA-Z_][a-zA-Z0-9_]*/);

		if (!wordRange) {
			throw new Error('Cannot rename this element.');
		}

		const word = document.getText(wordRange);

		// Check if this is part of a prefixed name (e.g., rdf:type)
		const text = document.lineAt(position.line).text;
		const charBefore = wordRange.start.character > 0 ? text[wordRange.start.character - 1] : '';
		const charAfter = wordRange.end.character < text.length ? text[wordRange.end.character] : '';

		// If character after is ':', this is a prefix (e.g., "rdf" in "rdf:type")
		if (charAfter === ':') {
			return {
				range: wordRange,
				placeholder: word
			};
		}

		// If character before is ':', this is a local name (e.g., "type" in "rdf:type")
		if (charBefore === ':') {
			return {
				range: wordRange,
				placeholder: word
			};
		}

		// Regular identifier (relation or variable)
		return {
			range: wordRange,
			placeholder: word
		};
	}

	/**
	 * Provides the rename edits for the symbol.
	 */
	public provideRenameEdits(document: vscode.TextDocument, position: vscode.Position, newName: string): vscode.ProviderResult<vscode.WorkspaceEdit> {
		const edits = new vscode.WorkspaceEdit();
		const wordRange = document.getWordRangeAtPosition(position, /[a-zA-Z_][a-zA-Z0-9_]*/);

		if (!wordRange) {
			return edits;
		}

		const word = document.getText(wordRange);
		const lineText = document.lineAt(position.line).text;
		const charBefore = wordRange.start.character > 0 ? lineText[wordRange.start.character - 1] : '';
		const charAfter = wordRange.end.character < lineText.length ? lineText[wordRange.end.character] : '';

		// Determine the type of symbol we're renaming
		const isPrefix = charAfter === ':';
		const isLocalName = charBefore === ':';

		const text = document.getText();

		if (isPrefix) {
			// Renaming a prefix (e.g., "rdf" in "rdf:type")
			// Find all occurrences of "prefix:" pattern
			const prefixPattern = new RegExp(`\\b${this.escapeRegEx(word)}:`, 'g');
			let match;

			while ((match = prefixPattern.exec(text)) !== null) {
				const startPos = document.positionAt(match.index);
				const endPos = document.positionAt(match.index + word.length);
				
				edits.replace(document.uri, new vscode.Range(startPos, endPos), newName);
			}
		} else if (isLocalName) {
			// Renaming a local name (e.g., "type" in "rdf:type")
			// Find the prefix before the colon
			const prefixMatch = lineText.substring(0, wordRange.start.character - 1).match(/([a-zA-Z_][a-zA-Z0-9_]*)$/);
			const prefix = prefixMatch ? prefixMatch[1] : '';

			if (prefix) {
				// Find all occurrences of "prefix:localname" pattern
				const localNamePattern = new RegExp(`\\b${this.escapeRegEx(prefix)}:${this.escapeRegEx(word)}\\b`, 'g');
				let match;

				while ((match = localNamePattern.exec(text)) !== null) {
					const localNameStart = match.index + prefix.length + 1; // +1 for the colon
					const startPos = document.positionAt(localNameStart);
					const endPos = document.positionAt(localNameStart + word.length);

					edits.replace(document.uri, new vscode.Range(startPos, endPos), newName);
				}
			}
		} else {
			// Renaming a regular identifier (relation or variable)
			// Use word boundary to match whole words only
			const identifierPattern = new RegExp(`\\b${this.escapeRegEx(word)}\\b`, 'g');
			let match;

			while ((match = identifierPattern.exec(text)) !== null) {
				// Skip if this is part of a prefixed name
				const charBeforeMatch = match.index > 0 ? text[match.index - 1] : '';
				const charAfterMatch = match.index + word.length < text.length ? text[match.index + word.length] : '';

				if (charBeforeMatch === ':' || charAfterMatch === ':') {
					continue;
				}

				const startPos = document.positionAt(match.index);
				const endPos = document.positionAt(match.index + word.length);

				edits.replace(document.uri, new vscode.Range(startPos, endPos), newName);
			}
		}

		return edits;
	}

	/**
	 * Escapes special regex characters in a string.
	 */
	private escapeRegEx(string: string): string {
		return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	}
}
