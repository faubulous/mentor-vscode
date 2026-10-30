import { TermProblem } from '../services/statement/term-problem';

/**
 * Put into words why a typed text reads as no term.
 * @param problem The problem.
 * @returns The message shown to the user.
 */
export function getTermProblemMessage(problem: TermProblem): string {
	switch (problem.kind) {
		case 'notAName':
			return 'A resource is written as a prefixed name or an <IRI>.';
		case 'undeclaredPrefix':
			return `The prefix '${problem.prefix}' is not declared.`;
	}
}
