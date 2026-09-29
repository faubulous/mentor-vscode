/**
 * Matches a variable bound by a GRAPH clause, capturing the variable name without its `?`.
 */
const GRAPH_VARIABLE_EXPRESSION = /GRAPH\s+\?([a-zA-Z_][a-zA-Z0-9_]*)/ig;

/**
 * Returns the names of the variables a query binds in its GRAPH clauses, which are the result
 * columns holding a named graph. A query can contain several GRAPH clauses, so every match is
 * read rather than only the first.
 * @param query The text of the executed query, if it is known.
 * @returns The variable names, without their leading `?`.
 */
export function getGraphVariables(query: string | undefined): Set<string> {
	const variables = new Set<string>();

	if (!query) {
		return variables;
	}

	for (const [, variable] of query.matchAll(GRAPH_VARIABLE_EXPRESSION)) {
		variables.add(variable);
	}

	return variables;
}
