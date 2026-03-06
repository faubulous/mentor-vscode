import * as vscode from "vscode";
import { Uri } from '@faubulous/mentor-rdf';
import { IToken, RdfToken } from '@faubulous/mentor-rdf-parsers';
import { getTokenPosition } from "@src/utilities";

/**
 * Base class of feature providers for Turtle documents.
 */
export class TurtleFeatureProvider {
	/**
	 * Gets the range of a token that contains an editable prefix.
	 * @param token A token.
	 * @returns The range of the prefix.
	 */
	protected getPrefixEditRange(token: IToken) {
		const { start } = getTokenPosition(token);

		switch (token.tokenType.name) {
			case RdfToken.PNAME_NS.name:
			case RdfToken.PNAME_LN.name: {
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
		const { start, end } = getTokenPosition(token);

		switch (token.tokenType.name) {
			case RdfToken.PNAME_LN.name: {
				const i = token.image.indexOf(":");

				return new vscode.Range(
					new vscode.Position(start.line, start.character + i + 1),
					new vscode.Position(end.line, end.character)
				);
			}
			case RdfToken.IRIREF.name: {
				let uri = token.image.trim();
				uri = uri.substring(1, uri.length - 1)

				const namespace = Uri.getNamespaceIri(uri);
				const label = uri.substring(namespace.length);

				const i = token.image.indexOf(label);

				return new vscode.Range(
					new vscode.Position(start.line, start.character + i),
					new vscode.Position(end.line, start.character + i + label.length)
				);
			}
			case RdfToken.VAR1.name: {
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