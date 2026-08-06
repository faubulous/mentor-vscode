import * as vscode from 'vscode';
import { IToken } from '@faubulous/mentor-rdf-parsers';
import { getTokenRange } from '@src/utilities';

/**
 * Get the whitespace-adjusted range of a token as a `vscode.Range`.
 * @param token A token.
 * @returns The range covering the token's non-whitespace content.
 */
export function getRangeFromToken(token: IToken): vscode.Range {
	const range = getTokenRange(token);

	return new vscode.Range(
		range.start.line,
		range.start.character,
		range.end.line,
		range.end.character
	);
}
