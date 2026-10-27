import { IToken, QuadContext, RdfSyntax, TurtleReader } from '@faubulous/mentor-rdf-parsers';
import { ParserFactory } from '@src/languages/parser-factory';

/**
 * The outcome of reading a text: its tokens and quad contexts, or why it cannot be read.
 */
export type DocumentReadResult =
	| { ok: true; tokens: IToken[]; quadContexts: QuadContext[] }
	| { ok: false; message: string };

/**
 * Tokenize, parse and read a text with the lexer, parser and reader of a syntax. The first lexing
 * or parsing error stops the reading, so a result that is `ok` is a well formed document.
 * @param syntax The syntax of the text.
 * @param text The text to read.
 * @returns The tokens and quad contexts, or the first error.
 */
export function readDocument(syntax: RdfSyntax, text: string): DocumentReadResult {
	const lexer = ParserFactory.getLexer(syntax);

	lexer.blankNodeIdGenerator = undefined;

	const lexed = lexer.tokenize(text);

	if (lexed.errors.length > 0) {
		return { ok: false, message: `The text does not tokenize: ${lexed.errors[0].message}` };
	}

	const parser = ParserFactory.getParser(syntax);
	const cst = parser.parse(lexed.tokens, false);
	const error = parser.errors[0] ?? parser.semanticErrors[0];

	if (error) {
		return { ok: false, message: `The text does not parse: ${error.message}` };
	}

	return { ok: true, tokens: lexed.tokens, quadContexts: _readQuadContexts(syntax, cst, lexed.tokens) };
}

/**
 * Read the quad contexts of a parsed text with the reader of its syntax.
 */
function _readQuadContexts(syntax: RdfSyntax, cst: ReturnType<ReturnType<typeof ParserFactory.getParser>['parse']>, tokens: IToken[]): QuadContext[] {
	const reader = ParserFactory.createReader(syntax);

	if (!('readQuadContexts' in reader)) {
		return [];
	}

	return reader instanceof TurtleReader
		? reader.readQuadContexts(cst, tokens)
		: (reader as { readQuadContexts(cst: unknown): QuadContext[] }).readQuadContexts(cst);
}
