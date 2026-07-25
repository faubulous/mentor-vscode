import { IToken } from '@faubulous/mentor-rdf-parsers';
import { PrefixMap } from '@src/utilities';
import { PositionMapper } from '@src/utilities/position';

/**
 * Context passed to each lint rule during diagnostic evaluation.
 */
export interface LintingContext {
	/**
	 * Maps a character offset to a position. Backed by an open document's
	 * `positionAt` or, during indexing, a content-based mapper — so lint rules
	 * work without a `vscode.TextDocument`.
	 */
	positionAt: PositionMapper;

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


