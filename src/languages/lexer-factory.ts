import {
	ILexer,
	RdfSyntax,
	TurtleLexer,
	TrigLexer,
	N3Lexer,
	NTriplesLexer,
	NQuadsLexer,
	SparqlLexer
} from '@faubulous/mentor-rdf-parsers';

/**
 * Creates a lexer instance for a given RDF syntax. This is the single source of truth
 * for mapping a syntax to its lexer on the client side. Lexers are stateless, so the
 * returned instance can be reused or discarded freely.
 * @param syntax The RDF syntax to create a lexer for.
 * @returns A lexer for the given syntax.
 */
export function createLexerForSyntax(syntax: RdfSyntax): ILexer {
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
