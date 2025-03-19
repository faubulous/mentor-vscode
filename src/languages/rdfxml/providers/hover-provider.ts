import * as vscode from 'vscode';
import { mentor } from '@/mentor';
import { getIriFromPrefixedName } from '@/utilities';

/**
 * Provides hover information for tokens.
 */
export class HoverProvider implements vscode.HoverProvider {
	/**
	 * Get the document context from a text document.
	 * @param document A text document.
	 * @returns A document context if the document is loaded, null otherwise.
	 */
	protected getDocumentContext(document: vscode.TextDocument) {
		const uri = document.uri.toString();

		if (!mentor.contexts[uri]) {
			return null;
		}

		return mentor.contexts[uri];
	}

	provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.Hover> {
		const context = this.getDocumentContext(document);

		if (!context) {
			return null;
		}

		// Find the full attribute (e.g., xml:lang) at the given position
		const line = document.lineAt(position.line).text;
		const attribute = this.getFullAttributeAtPosition(line, position.character);

		if (!attribute) {
			return null;
		}

		const iri = getIriFromPrefixedName(context.namespaces, attribute);

		if(!iri) {
			return null;
		}

		return new vscode.Hover(context.getResourceTooltip(iri));
	}

	/**
	 * Extracts the full attribute (e.g., xml:lang) at the given character position in a line of text.
	 * @param line The line of text.
	 * @param character The character position.
	 * @returns The full attribute or null if not found.
	 */
	private getFullAttributeAtPosition(line: string, character: number): string | null {
		// Match namespace-prefixed attributes (e.g., xml:lang)
		const regex = /[a-zA-Z_][\w.-]*:[a-zA-Z_][\w.-]*/g;

		let match: RegExpExecArray | null;
		while ((match = regex.exec(line)) !== null) {
			const start = match.index;
			const end = start + match[0].length;

			// Check if the character position falls within this match
			if (character >= start && character <= end) {
				return match[0]; // Return the full attribute
			}
		}

		return null; // No match found
	}
}
