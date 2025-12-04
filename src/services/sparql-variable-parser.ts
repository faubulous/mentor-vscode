import { Bindings } from "@rdfjs/types";

/**
 * A simple variable parser for SPARQL queries.
 * @remarks This is needed because Comunica does not preserve variable order in bindings.
 * @deprecated Will be provided by faubulous/mentor-parsers in the future.
 */
export class SparqlVariableParser {
	/**
	 * Extracts variable names from a SPARQL query string and returns 
	 * variable names in the order they appear in the SELECT clause.
	 */
	static parseSelectVariables(query: string, bindings: Bindings[]): string[] {
		if (!query) {
			return [];
		}

		const selectMatch = query.match(/select\s+(distinct|reduced)?\s*([\s\S]+?)\s+\b/i);

		if (!selectMatch) {
			return [];
		}

		const selectVars = selectMatch[2].trim();

		// Handle SELECT *
		if (selectVars.startsWith('*')) {
			if (bindings.length > 0) {
				return Array.from(bindings[0].keys()).map(v => v.value);
			}

			return [];
		}

		const result: string[] = [];
		const seen = new Set<string>();
		const n = selectVars.length;
		let i = 0;

		while (i < n) {
			// Skip whitespace
			while (i < n && /\s/.test(selectVars[i])) {
				i++;
			}

			if (i < n && selectVars[i] === '(') {
				// Parse (expr AS ?alias)
				let depth = 1;
				let start = ++i;

				while (i < n && depth > 0) {
					if (selectVars[i] === '(') {
						depth++;
					}
					else if (selectVars[i] === ')') {
						depth--;
					}

					i++;
				}

				const inside = selectVars.slice(start, i - 1);

				// Look for AS ?alias or AS @alias
				const asMatch = inside.match(/(?:AS|as)\s+([?@][a-zA-Z_][\w-]*)/);

				if (asMatch) {
					const varName = asMatch[1].substring(1);

					if (!seen.has(varName)) {
						result.push(varName);
						seen.add(varName);
					}
				}
			} else if (i < n && (selectVars[i] === '?' || selectVars[i] === '@')) {
				// Parse standalone variable
				let j = i + 1;

				while (j < n && /[a-zA-Z0-9_\-]/.test(selectVars[j])) {
					j++;
				}

				const varName = selectVars.slice(i + 1, j);

				// Skip empty variable names
				if (varName && !seen.has(varName)) {
					result.push(varName);
					seen.add(varName);
				}

				i = j;
			} else {
				// Skip to next whitespace or parenthesis
				while (i < n && !/\s|\(|\?|\@/.test(selectVars[i])) {
					i++;
				}
			}
		}

		return result;
	}
}