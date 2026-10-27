import { TermRef } from '../form-editor-model';

/**
 * A value read from a line: a term, the index of a blank-node placeholder, or a list of values.
 */
export type ParsedValue =
	| { kind: 'term'; term: TermRef }
	| { kind: 'hole'; index: number }
	| { kind: 'list'; items: ParsedValue[] };

/**
 * A statement line read into its predicate IRI and values.
 */
export interface ParsedLine {
	/**
	 * The IRI of the predicate.
	 */
	predicate: string;

	/**
	 * The values, in the order written.
	 */
	values: ParsedValue[];
}

/**
 * Why a line cannot be read as a statement, with the span of the text at fault.
 */
export interface LineProblem {
	/**
	 * What is wrong.
	 */
	message: string;

	/**
	 * The offset the text at fault starts at.
	 */
	start: number;

	/**
	 * The offset the text at fault ends at.
	 */
	end: number;
}

/**
 * Indicate whether a parse result is a problem.
 * @param result The result of parsing a line.
 * @returns `true` for a problem.
 */
export function isLineProblem(result: ParsedLine | LineProblem): result is LineProblem {
	return 'message' in result;
}
