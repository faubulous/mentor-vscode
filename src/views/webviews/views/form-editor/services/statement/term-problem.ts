/**
 * Why a typed text reads as no term: it is not written as the name of a resource, or it uses a
 * prefix the document does not declare. The components put it into words.
 */
export type TermProblem =
	| { kind: 'notAName' }
	| { kind: 'undeclaredPrefix'; prefix: string };
