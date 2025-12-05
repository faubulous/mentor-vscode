import { SparqlSyntaxParser } from "@faubulous/mentor-rdf";

/**
 * Helper class for parsing SPARQL variable names from queries.
 */
export class SparqlVariableParser {
	/**
	 * Instance of SparqlSyntaxParser for tokenizing SPARQL queries.
	 */
	private readonly _sparqlParser = new SparqlSyntaxParser();

	/**
	 * Parses the variable names from a SPARQL SELECT query in the order they were defined.
	 * @param query The SPARQL query string.
	 * @returns The list of variable names in the order they were defined in the SELECT clause, excluding the leading '?' or '$'.
	 */
	public parseSelectVariables(query: string): string[] {
		const result: string[] = [];

		for (const token of this._sparqlParser.tokenize(query)) {
			const type = token.tokenType?.name;

			if (type === "VAR1" || type === "VAR2") {
				// Remove the leading '?' or '$'
				const v = token.image.substring(1);

				if (!result.includes(v)) {
					result.push(v);
				}
			}

			if (type === "LCurly") {
				break;
			}
		}

		return result;
	}
}