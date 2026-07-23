import * as vscode from 'vscode';
import { IToken } from '@faubulous/mentor-rdf-parsers';
import { PrefixMap } from '@src/utilities';

/**
 * Context passed to each lint rule during diagnostic evaluation.
 */
export interface LintingContext {
	/**
	 * The text document being validated.
	 */
	document: vscode.TextDocument;

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


