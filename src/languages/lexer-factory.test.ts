import { describe, it, expect } from 'vitest';
import {
	RdfSyntax,
	TurtleLexer,
	TrigLexer,
	N3Lexer,
	NTriplesLexer,
	NQuadsLexer,
	SparqlLexer
} from '@faubulous/mentor-rdf-parsers';
import { createLexerForSyntax } from '@src/languages/lexer-factory';

describe('createLexerForSyntax', () => {
	it.each([
		[RdfSyntax.Turtle, TurtleLexer],
		[RdfSyntax.TriG, TrigLexer],
		[RdfSyntax.N3, N3Lexer],
		[RdfSyntax.NTriples, NTriplesLexer],
		[RdfSyntax.NQuads, NQuadsLexer],
		[RdfSyntax.Sparql, SparqlLexer],
	])('returns the matching lexer for %s', (syntax, lexerType) => {
		expect(createLexerForSyntax(syntax)).toBeInstanceOf(lexerType);
	});

	it('throws for an unsupported syntax', () => {
		expect(() => createLexerForSyntax(RdfSyntax.RdfXml)).toThrow();
	});
});
