import { IToken, QuadContext, RdfSyntax, TurtleReader } from '@faubulous/mentor-rdf-parsers';
import { ParserFactory } from '@src/languages/parser-factory';

/**
 * What reading a document yields: its tokens and quad contexts, or why it could not be read.
 */
export type DocumentReadResult =
	| { ok: true; tokens: IToken[]; quadContexts: QuadContext[] }
	| { ok: false; message: string };

/**
 * Reads the tokens and quad contexts of a text in a syntax, the way the edit synthesis and the
 * verification look at a document: without the file-scoped blank node identifiers of an open
 * document, so that two reads of the same text name their blank nodes alike.
 */
export class DocumentReader {
	/**
	 * Create a reader for a syntax.
	 * @param _syntax The syntax of the texts to read.
	 */
	constructor(private readonly _syntax: RdfSyntax) { }

	/**
	 * Read a text.
	 * @param text The text to read.
	 * @returns The tokens and quad contexts, or the first error that stops the read.
	 */
	read(text: string): DocumentReadResult {
		const lexer = ParserFactory.getLexer(this._syntax);

		lexer.blankNodeIdGenerator = undefined;

		const lexed = lexer.tokenize(text);

		if (lexed.errors.length > 0) {
			return { ok: false, message: `The text does not tokenize: ${lexed.errors[0].message}` };
		}

		const parser = ParserFactory.getParser(this._syntax);
		const cst = parser.parse(lexed.tokens, false);
		const error = parser.errors[0] ?? parser.semanticErrors[0];

		if (error) {
			return { ok: false, message: `The text does not parse: ${error.message}` };
		}

		return { ok: true, tokens: lexed.tokens, quadContexts: this._readQuadContexts(cst, lexed.tokens) };
	}

	/**
	 * Read the quad contexts of a syntax tree. Only the Turtle reader associates comments with
	 * statements, which requires the token stream.
	 * @param cst The syntax tree.
	 * @param tokens The tokens the tree was parsed from.
	 * @returns The quad contexts, or none for a syntax without a quad context reader.
	 */
	private _readQuadContexts(cst: ReturnType<ReturnType<typeof ParserFactory.getParser>['parse']>, tokens: IToken[]): QuadContext[] {
		const reader = ParserFactory.createReader(this._syntax);

		if (!('readQuadContexts' in reader)) {
			return [];
		}

		return reader instanceof TurtleReader
			? reader.readQuadContexts(cst, tokens)
			: (reader as { readQuadContexts(cst: unknown): QuadContext[] }).readQuadContexts(cst);
	}
}
