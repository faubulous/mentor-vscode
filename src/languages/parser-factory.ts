import {
	ILexer,
	IParser,
	RdfSyntax,
	TurtleLexer,
	TurtleParser,
	TurtleReader,
	TrigLexer,
	TrigParser,
	TrigReader,
	N3Lexer,
	N3Parser,
	N3Reader,
	NTriplesLexer,
	NTriplesParser,
	NTriplesReader,
	NQuadsLexer,
	NQuadsParser,
	NQuadsReader,
	SparqlLexer,
	SparqlParser
} from '@faubulous/mentor-rdf-parsers';

/**
 * A helper class which provides the lexers and parsers for the supported RDF
 * syntaxes. This is the single source of truth for mapping a syntax to its
 * chevrotain lexer and parser on the client side.
 *
 * Chevrotain lexer and parser construction performs an expensive analysis
 * (~3-7 ms per lexer, ~4 ms per parser), so shared instances are created once
 * per syntax and reused. Because the instances are shared, callers that use
 * `blankNodeIdGenerator` must set it on every call; `parse()` resets all
 * document-specific parser state.
 */
export class ParserFactory {
	/**
	 * Shared lexer instances keyed by syntax.
	 */
	private static readonly _lexers = new Map<RdfSyntax, ILexer>();

	/**
	 * Shared parser instances keyed by syntax.
	 */
	private static readonly _parsers = new Map<RdfSyntax, IParser>();

	/**
	 * Returns a shared lexer instance for a given RDF syntax.
	 * @param syntax The RDF syntax to get a lexer for.
	 * @returns A shared lexer for the given syntax.
	 */
	static getLexer(syntax: RdfSyntax): ILexer {
		let lexer = this._lexers.get(syntax);

		if (!lexer) {
			lexer = this.createLexer(syntax);
			this._lexers.set(syntax, lexer);
		}

		return lexer;
	}

	/**
	 * Returns a shared parser instance for a given RDF syntax.
	 * @param syntax The RDF syntax to get a parser for.
	 * @returns A shared parser for the given syntax.
	 */
	static getParser(syntax: RdfSyntax): IParser {
		let parser = this._parsers.get(syntax);

		if (!parser) {
			parser = this.createParser(syntax);
			this._parsers.set(syntax, parser);
		}

		return parser;
	}

	/**
	 * Creates a new lexer instance for a given RDF syntax. Note that lexer
	 * construction is expensive — prefer {@link getLexer} on hot paths.
	 * @param syntax The RDF syntax to create a lexer for.
	 * @returns A lexer for the given syntax.
	 */
	static createLexer(syntax: RdfSyntax): ILexer {
		switch (syntax) {
			case RdfSyntax.Turtle:
				return new TurtleLexer();
			case RdfSyntax.TriG:
				return new TrigLexer();
			case RdfSyntax.N3:
				return new N3Lexer();
			case RdfSyntax.NTriples:
				return new NTriplesLexer();
			case RdfSyntax.NQuads:
				return new NQuadsLexer();
			case RdfSyntax.Sparql:
				return new SparqlLexer();
			default:
				throw new Error(`No lexer available for syntax: ${syntax}`);
		}
	}

	/**
	 * Creates a new parser instance for a given RDF syntax. Note that parser
	 * construction is expensive — prefer {@link getParser} on hot paths.
	 * @param syntax The RDF syntax to create a parser for.
	 * @returns A parser for the given syntax.
	 */
	static createParser(syntax: RdfSyntax): IParser {
		switch (syntax) {
			case RdfSyntax.Turtle:
				return new TurtleParser();
			case RdfSyntax.TriG:
				return new TrigParser();
			case RdfSyntax.N3:
				return new N3Parser();
			case RdfSyntax.NTriples:
				return new NTriplesParser();
			case RdfSyntax.NQuads:
				return new NQuadsParser();
			case RdfSyntax.Sparql:
				return new SparqlParser();
			default:
				throw new Error(`No parser available for syntax: ${syntax}`);
		}
	}

	/**
	 * Creates a new reader (CST visitor) instance for a given RDF syntax. Unlike
	 * lexers and parsers, readers hold per-document state (namespaces, base IRI)
	 * and are cheap to construct, so they are not shared. The reader must match
	 * the parser that produced the CST — see {@link getParser}.
	 * @param syntax The RDF syntax to create a reader for.
	 * @returns A reader whose `visit` returns the quads of a parsed document.
	 */
	static createReader(syntax: RdfSyntax): TurtleReader | TrigReader | N3Reader | NTriplesReader | NQuadsReader {
		switch (syntax) {
			case RdfSyntax.Turtle:
				return new TurtleReader();
			case RdfSyntax.TriG:
				return new TrigReader();
			case RdfSyntax.N3:
				return new N3Reader();
			case RdfSyntax.NTriples:
				return new NTriplesReader();
			case RdfSyntax.NQuads:
				return new NQuadsReader();
			default:
				throw new Error(`No reader available for syntax: ${syntax}`);
		}
	}
}
