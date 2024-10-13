import * as vscode from "vscode";
import { mentor } from "../mentor";
import { IToken } from "millan";
import { countLeadingWhitespace, countTrailingWhitespace, getNamespaceIri, getTokenPosition } from "../utilities";

export class FeatureProvider {
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

	/**
	 * Get the location of a token in a document.
	 * @param documentUri The URI of the document.
	 * @param token A token.
	 */
	protected getRangeFromToken(token: IToken) {
		// The token positions are 1-based, whereas the editor positions / locations are 0-based.
		const startLine = token.startLine ? token.startLine - 1 : 0;
		const startCharacter = token.startColumn ? token.startColumn - 1 : 0;
		const startWhitespace = countLeadingWhitespace(token.image);

		const endLine = token.endLine ? token.endLine - 1 : 0;
		const endCharacter = token.endColumn ? token.endColumn - 1 : 0;
		const endWhitespace = countTrailingWhitespace(token.image);

		// TODO: File bug report for millan parser.
		// Note: The millan parser incorrectly parses some tokens with leading and trailing whitespace.
		// We account for this by adjusting the start and end positions.
		const start = new vscode.Position(startLine, startCharacter + startWhitespace);
		const end = new vscode.Position(endLine, endCharacter - endWhitespace).translate(0, 1);

		return new vscode.Range(start, end);
	}

	/**
	 * Indicates whether the cursor position is on a namespace prefix
	 * @param token A token.
	 * @param position The position of the cursor.
	 * @returns true if the cursor is on the prefix of the token, false otherwise.
	 */
	protected isCursorOnPrefix(token: IToken, position: vscode.Position) {
		const tokenType = token.tokenType?.tokenName;
		const p = getTokenPosition(token);

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

	/**
	 * Gets the range of a token that contains an editable prefix.
	 * @param token A token.
	 * @returns The range of the prefix.
	 */
	protected getPrefixEditRange(token: IToken) {
		const tokenType = token.tokenType?.tokenName;
		const p = getTokenPosition(token);

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

	/**
	 * Gets the range of a token that contains an editable resource label.
	 * @param token A token.
	 * @returns The range of the label.
	 */
	protected getLabelEditRange(token: IToken) {
		const tokenType = token.tokenType?.tokenName;
		const p = getTokenPosition(token);

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

				const namespace = getNamespaceIri(uri);
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
}