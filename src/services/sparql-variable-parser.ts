import { SparqlLexer, TOKENS } from "@faubulous/mentor-rdf-parsers";

/**
 * Helper class for parsing SPARQL variable names from queries.
 */
export class SparqlVariableParser {
	/**
	 * Instance of SparqlLexer for tokenizing SPARQL queries.
	 */
	private readonly _sparqlLexer = new SparqlLexer();

	/**
	 * Parses the variable names from a SPARQL SELECT query in the order they were defined.
	 * @param query The SPARQL query string.
	 * @returns The list of variable names in the order they were defined in the SELECT clause, excluding the leading '?' or '$'.
	 */
	public parseSelectVariables(query: string): string[] {
		const result: string[] = [];
		const lexingResult = this._sparqlLexer.tokenize(query);

		for (const token of lexingResult.tokens) {
			const type = token.tokenType;

			if (type === TOKENS.VAR1 || type === TOKENS.VAR2) {
				// Remove the leading '?' or '$'
				const v = token.image.substring(1);

				if (!result.includes(v)) {
					result.push(v);
				}
			}

			if (type === TOKENS.LCURLY) {
				break;
			}
		}

		return result;
	}
}