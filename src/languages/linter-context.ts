import { IToken } from '@faubulous/mentor-rdf-parsers';
import { Position } from 'vscode-languageserver-types';
import { PrefixMap } from '@src/utilities';

/**
 * @note This code is in the languages directory because the providers may not import vscode APIs.
 */

/**
 * The minimal document surface required for computing diagnostics. Both the
 * language server's `TextDocument` and the extension host's `vscode.TextDocument`
 * satisfy this interface, allowing the lint rules to run in either environment.
 */
export interface LintDocument {
	/**
	 * Returns the text of the document.
	 */
	getText(): string;

	/**
	 * Converts a zero-based document offset to a position.
	 * @param offset A zero-based document offset.
	 */
	positionAt(offset: number): Position;
}

/**
 * Context passed to each lint rule during diagnostic evaluation.
 */
export interface LintDiagnosticsContext {
	/**
	 * The text document being validated.
	 */
	document: LintDocument;

	/**
	 * The raw text content of the document.
	 */
	content: string;

	/**
	 * All tokens produced by the lexer.
	 */
	tokens: IToken[];

	/**
	 * Namespace prefix map collected from the document's prefix declarations.
	 */
	prefixes: PrefixMap;
}


