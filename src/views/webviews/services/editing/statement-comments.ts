import { IToken, QuadContext } from '@faubulous/mentor-rdf-parsers';
import { getCommentText, splitCommentRuns } from '@src/utilities/tokens';
import { ResourceIndexEntry, isCollectionChainPredicate } from './resource-index';

/**
 * The comment lines written above a statement, split by what they stand over.
 */
export interface StatementComments {
	/**
	 * The lines written before the predicate, which introduce the property, or the resource for
	 * its first statement.
	 */
	aboveProperty: string[];

	/**
	 * The lines written between the predicate and the object, which introduce that one value.
	 */
	aboveValue: string[];
}

/**
 * Get the comments written above a statement.
 *
 * The reader keeps the comments that close a document with its last statement, where they read
 * as a footer rather than as something introducing anything. They are told apart by their
 * position: a comment introducing a statement is written before it.
 * @param quad The statement.
 * @returns The comment tokens written above the statement.
 */
function _leadingCommentsOf(quad: QuadContext): IToken[] {
	// Measured against the object, which is the one part of a statement that is always its own:
	// a subject is written once for a block and a predicate once for a list of values, so either
	// of them can precede a comment written inside the statement they belong to.
	const start = quad.objectToken?.startOffset ?? quad.predicateToken?.startOffset ?? 0;

	return (quad.leadingComments ?? []).filter(comment => comment.startOffset < start);
}

/**
 * Split the comments written above a statement by what they stand over.
 * @param quad The statement.
 * @returns The comment texts above the property and above the value.
 */
export function splitLeadingComments(quad: QuadContext): StatementComments {
	const leading = _leadingCommentsOf(quad);
	const aboveProperty = _commentsAbovePredicate(quad, leading);

	return {
		aboveProperty: aboveProperty.map(getCommentText),
		aboveValue: leading.filter(comment => !aboveProperty.includes(comment)).map(getCommentText)
	};
}

/**
 * Get the comments written above the first statement of a resource, which introduce the resource.
 * @param entry The resource.
 * @returns The lines of each run of comments, or `undefined` when the resource carries none.
 */
export function leadingCommentRunsOf(entry: ResourceIndexEntry): string[][] | undefined {
	const first = entry.quads.find(quad => !isCollectionChainPredicate(quad.predicate.value)) ?? entry.quads[0];

	if (!first) {
		return undefined;
	}

	const runs = splitCommentRuns(_commentsAbovePredicate(first, _leadingCommentsOf(first))).map(run => run.map(getCommentText));

	return runs.length > 0 ? runs : undefined;
}

/**
 * Get the comments that close a document. The reader attaches them to the last statement it
 * reads, where {@link _leadingCommentsOf} leaves them out; they are the ones written after the
 * object of the last statement of the document.
 * @param quadContexts The statements of the document.
 * @returns The lines of each run of comments, in the order they were written.
 */
export function trailingCommentRunsOf(quadContexts: readonly QuadContext[]): string[][] {
	const lastObjectStart = Math.max(-1, ...quadContexts.map(quad => quad.objectToken?.startOffset ?? -1));
	const trailing = new Map<number, IToken>();

	for (const quad of quadContexts) {
		for (const comment of quad.leadingComments ?? []) {
			if (comment.startOffset >= lastObjectStart) {
				trailing.set(comment.startOffset, comment);
			}
		}
	}

	const sorted = Array.from(trailing.values()).sort((first, second) => first.startOffset - second.startOffset);

	return splitCommentRuns(sorted).map(run => run.map(getCommentText));
}

/**
 * The comments written above a statement before its predicate, all of them when the statement
 * has no predicate token of its own.
 * @param quad The statement.
 * @param leading The comments written above the statement.
 * @returns The comments before the predicate.
 */
function _commentsAbovePredicate(quad: QuadContext, leading: IToken[]): IToken[] {
	const predicateStart = quad.predicateToken?.startOffset;

	return predicateStart === undefined ? leading : leading.filter(comment => comment.startOffset < predicateStart);
}
