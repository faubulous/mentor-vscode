import { SparqlLexer, RdfToken, IToken } from '@faubulous/mentor-rdf-parsers';
import { SparqlQueryInfo } from './sparql-query-info.js';

/** Token type names that mark the start of a top-level SPARQL query or update. */
const QUERY_FORM_NAMES = new Set<string>([
	RdfToken.SELECT.name,
	RdfToken.CONSTRUCT.name,
	RdfToken.ASK.name,
	RdfToken.DESCRIBE.name,
	RdfToken.INSERT.name,
	RdfToken.DELETE_KW.name,
	RdfToken.LOAD.name,
	RdfToken.CLEAR.name,
	RdfToken.CREATE_KW.name,
	RdfToken.DROP.name,
	RdfToken.COPY.name,
	RdfToken.MOVE.name,
	RdfToken.ADD_KW.name,
	RdfToken.WITH_KW.name,
]);

/**
 * Splits a SPARQL document into structural information about its individual
 * queries and update operations using token-based analysis only, without
 * executing any query or loading RDF triples.
 */
export class SparqlQuerySplitter {
	/**
	 * Parses a SPARQL document text and returns structural information for each
	 * top-level query or update found in the document.
	 *
	 * @param text - The full text of the SPARQL document.
	 * @returns An array of `SparqlQueryInfo`, one per top-level query.
	 */
	splitFile(text: string): SparqlQueryInfo[] {
		if (!text?.trim()) {
			return [];
		}

		const lexResult = new SparqlLexer(null).tokenize(text);

		// Filter out whitespace and comment tokens — they carry no structural meaning.
		const tokens = lexResult.tokens.filter(
			t => t.tokenType.name !== 'WS' && t.tokenType.name !== 'COMMENT'
		);

		if (tokens.length === 0) {
			return [];
		}

		const queryStarts = this._findTopLevelQueryStarts(tokens);

		if (queryStarts.length === 0) {
			return [];
		}

		const queries: SparqlQueryInfo[] = [];

		for (let q = 0; q < queryStarts.length; q++) {
			const start = queryStarts[q];
			const end = q + 1 < queryStarts.length
				? queryStarts[q + 1] - 1
				: tokens.length - 1;

			const queryTokens = tokens.slice(start, end + 1);

			queries.push(this._parseQueryInfo(queryTokens));
		}

		return queries;
	}

	/**
	 * Returns the token indices (into the given flat token array) where a
	 * top-level SPARQL query or update begins.
	 */
	private _findTopLevelQueryStarts(tokens: IToken[]): number[] {
		const starts: number[] = [];
		let depth = 0;

		for (let i = 0; i < tokens.length; i++) {
			const name = tokens[i].tokenType.name;

			if (name === RdfToken.LCURLY.name) {
				depth++;
			} else if (name === RdfToken.RCURLY.name) {
				depth--;
			} else if (depth === 0 && QUERY_FORM_NAMES.has(name)) {
				starts.push(i);
			}
		}

		return starts;
	}

	/**
	 * Builds a `SparqlQueryInfo` from a slice of tokens representing a single
	 * top-level query or update.
	 */
	private _parseQueryInfo(tokens: IToken[]): SparqlQueryInfo {
		if (tokens.length === 0) {
			return { startLine: 0, endLine: 0, type: RdfToken.SELECT, projectedVariables: [], allVariables: [], subqueries: [] };
		}

		const firstToken = tokens[0];
		const lastToken = tokens[tokens.length - 1];
		const startLine = (firstToken.startLine ?? 1) - 1;
		const endLine = (lastToken.startLine ?? 1) - 1;
		const type = firstToken.tokenType;

		const allVariables = this._collectAllVariables(tokens);

		const projectedVariables = type === RdfToken.SELECT
			? this._extractProjectedVariables(tokens, allVariables)
			: [];

		const subqueries = type === RdfToken.SELECT
			? this._extractSubqueries(tokens)
			: [];

		return { startLine, endLine, type, projectedVariables, allVariables, subqueries };
	}

	/**
	 * Returns all unique variable names (including `?`/`$` prefix) found in the
	 * token list, in order of their first appearance.
	 */
	private _collectAllVariables(tokens: IToken[]): string[] {
		const seen = new Map<string, number>(); // name → startOffset of first occurrence

		for (const token of tokens) {
			if (token.tokenType.name === RdfToken.VAR1.name || token.tokenType.name === RdfToken.VAR2.name) {
				if (!seen.has(token.image)) {
					seen.set(token.image, token.startOffset);
				}
			}
		}

		return [...seen.entries()]
			.sort((a, b) => a[1] - b[1])
			.map(([name]) => name);
	}

	/**
	 * Returns the variables that appear in the SELECT projection, i.e. the
	 * tokens between the SELECT keyword and the first top-level WHERE/`{`.
	 *
	 * Handles `SELECT *` by returning all variables from `allVariables`.
	 */
	private _extractProjectedVariables(tokens: IToken[], allVariables: string[]): string[] {
		// The projection ends at the first WHERE keyword or LCURLY at depth 0.
		const projectionTokens: IToken[] = [];

		for (const token of tokens) {
			const name = token.tokenType.name;

			if (name === RdfToken.WHERE.name || name === RdfToken.LCURLY.name) {
				break;
			}

			projectionTokens.push(token);
		}

		// SELECT * → project all variables
		if (projectionTokens.some(t => t.tokenType.name === RdfToken.STAR.name)) {
			return [...allVariables];
		}

		const projected = new Map<string, number>();

		for (const token of projectionTokens) {
			if (token.tokenType.name === RdfToken.VAR1.name || token.tokenType.name === RdfToken.VAR2.name) {
				if (!projected.has(token.image)) {
					projected.set(token.image, token.startOffset);
				}
			}
		}

		return [...projected.entries()]
			.sort((a, b) => a[1] - b[1])
			.map(([name]) => name);
	}

	/**
	 * Finds nested SELECT subqueries inside the WHERE clause of the given token
	 * slice and returns structural information for each one.
	 */
	private _extractSubqueries(tokens: IToken[]): SparqlQueryInfo[] {
		const subqueries: SparqlQueryInfo[] = [];
		let depth = 0;
		let subStart = -1;
		let subDepth = 0;

		for (let i = 0; i < tokens.length; i++) {
			const name = tokens[i].tokenType.name;

			if (name === RdfToken.LCURLY.name) {
				depth++;

				if (subStart >= 0) {
					subDepth++;
				}
			} else if (name === RdfToken.RCURLY.name) {
				if (subStart >= 0) {
					if (subDepth === 0) {
						// End of the subquery's WHERE block
						const subTokens = tokens.slice(subStart, i + 1);
						
						subqueries.push(this._parseQueryInfo(subTokens));

						subStart = -1;
					} else {
						subDepth--;
					}
				}

				depth--;
			} else if (depth >= 1 && subStart < 0 && name === RdfToken.SELECT.name) {
				// Nested SELECT at depth >= 1 starts a subquery
				subStart = i;
				subDepth = 0;
			}
		}

		return subqueries;
	}
}
