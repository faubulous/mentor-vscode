import * as vscode from "vscode";
import { IToken } from "millan";
import { getNamespaceIri, getTokenPosition } from "@/utilities";

/**
 * Base class of feature providers for Turtle documents.
 */
export class TurtleFeatureProvider {
	/**
	 * Indicates whether the cursor position is on a namespace prefix
	 * @param token A token.
	 * @param position The position of the cursor.
	 * @returns true if the cursor is on the prefix of the token, false otherwise.
	 */
	protected isCursorOnPrefix(token: IToken, position: vscode.Position) {
		const tokenType = token.tokenType?.tokenName;
		const { start } = getTokenPosition(token);

		switch (tokenType) {
			case "PNAME_NS":
			case "PNAME_LN": {
				const i = token.image.indexOf(":");
				const n = position.character - start.character;

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
		const { start } = getTokenPosition(token);

		switch (tokenType) {
			case "PNAME_NS":
			case "PNAME_LN": {
				const i = token.image.indexOf(":");

				return new vscode.Range(
					new vscode.Position(start.line, start.character),
					new vscode.Position(start.line, start.character + i)
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
		const { start, end } = getTokenPosition(token);

		switch (tokenType) {
			case "PNAME_LN": {
				const i = token.image.indexOf(":");

				return new vscode.Range(
					new vscode.Position(start.line, start.character + i + 1),
					new vscode.Position(end.line, end.character)
				);
			}
			case "IRIREF": {
				let uri = token.image.trim();
				uri = uri.substring(1, uri.length - 1)

				const namespace = getNamespaceIri(uri);
				const label = uri.substring(namespace.length);

				const i = token.image.indexOf(label);

				return new vscode.Range(
					new vscode.Position(start.line, start.character + i),
					new vscode.Position(end.line, start.character + i + label.length)
				);
			}
			case "VAR1": {
				return new vscode.Range(
					new vscode.Position(start.line, start.character + 1),
					new vscode.Position(end.line, end.character)
				);
			}
			default: {
				return null;
			}
		}
	}
}