import * as vscode from 'vscode';
import { mentor } from '@/mentor';
import { getIriFromPrefixedName } from '@/utilities';

/**
 * Provides hover information for tokens.
 */
export class XmlHoverProvider implements vscode.HoverProvider {
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

		let iri: string | undefined = undefined;
		let pname = this.getPrefixedNameAttributeAtPosition(line, position.character);

		if (pname) {
			iri = getIriFromPrefixedName(context.namespaces, pname);
		} else {
			iri = this.getQuotedIriAtPosition(line, position.character);
		}

		if (iri) {
			return new vscode.Hover(context.getResourceTooltip(iri));
		}
		else {
			return null;
		}
	}

	/**
	 * Extracts the full attribute (e.g., xml:lang) at the given character position in a line of text.
	 * @param line The line of text.
	 * @param character The character position.
	 * @returns The full attribute or null if not found.
	 */
	private getPrefixedNameAttributeAtPosition(line: string, character: number): string | undefined {
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
	}

	private getQuotedIriAtPosition(line: string, character: number): string | undefined {
		// Match full IRIs in quotes (e.g., "http://example.org/")
		const regex = /(https?:\/\/[^\s"'<>)]+)/g;

		let match: RegExpExecArray | null;

		while ((match = regex.exec(line)) !== null) {
			const start = match.index;
			const end = start + match[0].length;

			if (character >= start && character <= end) {
				return match[1];
			}
		}
	}
}
