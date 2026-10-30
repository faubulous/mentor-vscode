import { TermRef } from '../../form-editor-model';

/**
 * A value read from a statement text: a term, a `[` typed to add a nested blank node with its number among
 * those of the statement text, or a list of values.
 */
export type ParsedValue =
	| { kind: 'term'; term: TermRef }
	| { kind: 'nestedNode'; index: number }
	| { kind: 'list'; items: ParsedValue[] };

/**
 * A statement text read into its predicate IRI and values.
 */
export interface ParsedStatementText {
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
 * Why a statement text cannot be read as a statement, with the span of the text at fault.
 */
export interface StatementTextProblem {
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
 * @param result The result of parsing a statement text.
 * @returns `true` for a problem.
 */
export function isStatementTextProblem(result: ParsedStatementText | StatementTextProblem): result is StatementTextProblem {
	return 'message' in result;
}
