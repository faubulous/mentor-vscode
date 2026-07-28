import { describe, it, expect } from 'vitest';
import {
	RdfSyntax,
	TurtleLexer,
	TurtleReader,
	TrigLexer,
	TrigReader,
	N3Lexer,
	N3Reader,
	NTriplesLexer,
	NTriplesReader,
	NQuadsLexer,
	NQuadsReader,
	SparqlLexer,
	SparqlReader
} from '@faubulous/mentor-rdf-parsers';
import { ParserFactory } from '@src/languages/parser-factory';

describe('ParserFactory', () => {
	describe('getLexer', () => {
		it('returns the same shared instance for repeated calls with the same syntax', () => {
			const first = ParserFactory.getLexer(RdfSyntax.Turtle);
			const second = ParserFactory.getLexer(RdfSyntax.Turtle);

			expect(second).toBe(first);
		});

		it('returns distinct instances for different syntaxes', () => {
			expect(ParserFactory.getLexer(RdfSyntax.Turtle)).not.toBe(ParserFactory.getLexer(RdfSyntax.Sparql));
		});

		it('produces a working lexer', () => {
			const lexer = ParserFactory.getLexer(RdfSyntax.Turtle);
			const result = lexer.tokenize('@prefix ex: <http://example.org/> .');

			expect(result.tokens.length).toBeGreaterThan(0);
		});
	});

	describe('getParser', () => {
		it('returns the same shared instance for repeated calls with the same syntax', () => {
			const first = ParserFactory.getParser(RdfSyntax.Turtle);
			const second = ParserFactory.getParser(RdfSyntax.Turtle);

			expect(second).toBe(first);
		});
	});

	describe('createLexer', () => {
		it.each([
			[RdfSyntax.Turtle, TurtleLexer],
			[RdfSyntax.TriG, TrigLexer],
			[RdfSyntax.N3, N3Lexer],
			[RdfSyntax.NTriples, NTriplesLexer],
			[RdfSyntax.NQuads, NQuadsLexer],
			[RdfSyntax.Sparql, SparqlLexer],
		])('returns the matching lexer for %s', (syntax, lexerType) => {
			expect(ParserFactory.createLexer(syntax)).toBeInstanceOf(lexerType);
		});

		it('creates a new instance on every call', () => {
			expect(ParserFactory.createLexer(RdfSyntax.Turtle)).not.toBe(ParserFactory.createLexer(RdfSyntax.Turtle));
		});

		it('throws for an unsupported syntax', () => {
			expect(() => ParserFactory.createLexer(RdfSyntax.RdfXml)).toThrow();
		});
	});

	describe('createParser', () => {
		it('throws for an unsupported syntax', () => {
			expect(() => ParserFactory.createParser(RdfSyntax.RdfXml)).toThrow();
		});
	});

	describe('createReader', () => {
		it.each([
			[RdfSyntax.Turtle, TurtleReader],
			[RdfSyntax.TriG, TrigReader],
			[RdfSyntax.N3, N3Reader],
			[RdfSyntax.NTriples, NTriplesReader],
			[RdfSyntax.NQuads, NQuadsReader],
			[RdfSyntax.Sparql, SparqlReader],
		])('returns the matching reader for %s', (syntax, readerType) => {
			expect(ParserFactory.createReader(syntax)).toBeInstanceOf(readerType);
		});

		it('creates a new instance on every call', () => {
			expect(ParserFactory.createReader(RdfSyntax.Turtle)).not.toBe(ParserFactory.createReader(RdfSyntax.Turtle));
		});

		it('throws for an unsupported syntax', () => {
			expect(() => ParserFactory.createReader(RdfSyntax.RdfXml)).toThrow();
		});
	});
});
