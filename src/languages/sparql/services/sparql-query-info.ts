import { TokenType } from '@faubulous/mentor-rdf-parsers';

/**
 * Static structural information extracted from a single SPARQL query or update
 * by lexical analysis, without executing the query.
 */
export interface SparqlQueryInfo {
	/**
	 * The 0-based line number where the query's leading keyword (SELECT, CONSTRUCT, etc.) begins.
	 */
	startLine: number;

	/**
	 * The 0-based line number of the last token in the query.
	 */
	endLine: number;

	/**
	 * The Chevrotain token type of the leading keyword (e.g. RdfToken.SELECT, RdfToken.INSERT).
	 */
	type: TokenType;

	/**
	 * Variables explicitly projected in the SELECT clause.
	 * Empty for non-SELECT queries.
	 * Variable names include the leading `?` character.
	 */
	projectedVariables: string[];

	/**
	 * All variables referenced anywhere in the query scope (WHERE clause, GROUP BY, etc.).
	 * Variable names include the leading `?` or `$` character.
	 * For SELECT queries this is a superset of `projectedVariables`.
	 */
	allVariables: string[];

	/**
	 * Nested SELECT subqueries found within this query's WHERE clause.
	 */
	subqueries: SparqlQueryInfo[];
}
