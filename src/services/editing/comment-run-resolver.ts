import { IToken } from '@faubulous/mentor-rdf-parsers';
import { indentBefore, lineStartOffset, nextLineStartOffset } from '@src/utilities/string';
import { previousNonCommentTokenIndex, splitCommentRuns, tokenEnd } from '@src/utilities/tokens';
import { CommentAnchor } from './comment-anchor';
import { EditRejectionError } from './edit-rejection';
import { PropertyOperations } from './operations/property-operations';
import { StatementLocator } from './statement-locator';
import { TokenSpan } from './statement-model';
import { SynthesisContext } from './synthesis-context';
import { TermRef } from './term-ref';

/**
 * A run of comment lines in the document, or the place where one would be written.
 */
export interface CommentRun {
	/**
	 * The comment tokens of the run, in order; empty when nothing is written there yet.
	 */
	tokens: IToken[];

	/**
	 * The offset the whole lines of the run start at, or the start of the range an inserted run
	 * replaces.
	 */
	start: number;

	/**
	 * The offset the whole lines of the run end at, exclusive.
	 */
	end: number;

	/**
	 * The indentation of the lines of the run.
	 */
	indent: string;

	/**
	 * What goes before the lines when the run is written into a line holding other content.
	 */
	prefix: string;

	/**
	 * What goes after the lines when the run is written into a line holding other content.
	 */
	suffix: string;
}

/**
 * Locates the run of comment lines an anchor names, or the place where one would be written.
 */
export class CommentRunResolver {
	/**
	 * Create a resolver for one user action.
	 * @param _context The shared state of the action.
	 */
	constructor(private readonly _context: SynthesisContext) { }

	/**
	 * Locate the run an anchor names.
	 * @param anchor The anchor.
	 * @returns The run.
	 * @throws {EditRejectionError} If the anchor points at nothing in the document.
	 */
	resolve(anchor: CommentAnchor): CommentRun {
		switch (anchor.kind) {
			case 'resource':
				return this._resourceRun(anchor.subject, anchor.run);
			case 'property':
				return this._propertyRun(anchor.subject, anchor.predicate);
			case 'value': {
				const { block, group, span } = new StatementLocator(this._context.model).valueAt(anchor.at);

				return this._runAbove(span, span.leadingComments, this._context.styleDetector.objectIndentFor(block, group));
			}
			default:
				return this._documentRun(anchor.index);
		}
	}

	/**
	 * The run above the block of a resource, by its index among the runs there; the last one,
	 * nearest the resource, when no index is given. A node written inline has no line of its own
	 * to stand above, so its runs are the ones above its first predicate.
	 * @param subject The resource.
	 * @param run The index of the run.
	 * @returns The run.
	 * @throws {EditRejectionError} If the resource is not written or has no run of that index.
	 */
	private _resourceRun(subject: TermRef, run: number | undefined): CommentRun {
		const blocks = new StatementLocator(this._context.model).blocksOf(subject);
		const block = blocks.find(candidate => candidate.nested) ?? blocks[0];

		if (block.nested) {
			const group = block.groups[0];

			return this._runAbove(group, _nthRun(group.leadingComments, run), this._context.styleDetector.predicateIndentFor(block));
		}

		return this._runAbove(block, _nthRun(block.leadingComments, run), indentBefore(this._context.model.text, block.start) ?? '');
	}

	/**
	 * The run above the first statement of a predicate.
	 * @param subject The resource.
	 * @param predicate The predicate IRI.
	 * @returns The run.
	 * @throws {EditRejectionError} If the resource does not carry the predicate.
	 */
	private _propertyRun(subject: TermRef, predicate: string): CommentRun {
		const { block, group } = new PropertyOperations(this._context).findPredicateGroups(subject, predicate)[0];

		return this._runAbove(group, group.leadingComments, this._context.styleDetector.predicateIndentFor(block));
	}

	/**
	 * The run of comment lines closing the document that holds a line, by the index of the line
	 * among them.
	 * @param index The index of the line.
	 * @returns The run.
	 * @throws {EditRejectionError} If no closing comment has that index.
	 */
	private _documentRun(index: number): CommentRun {
		const comments = this._context.model.documentComments;
		const run = comments[index] ? splitCommentRuns(comments).find(candidate => candidate.includes(comments[index])) : undefined;

		if (!run) {
			throw new EditRejectionError('notFound', 'The comment is no longer in the document.');
		}

		return this._existingRun(run);
	}

	/**
	 * The run above a span: its comment lines when it has some, or the place where they would be
	 * written. A span that starts its line takes the lines above it; one written after other
	 * content on its line moves to a line of its own, below the lines.
	 * @param span The span.
	 * @param leading The comment lines written above the span.
	 * @param indent The indentation of the lines when written anew.
	 * @returns The run.
	 */
	private _runAbove(span: TokenSpan, leading: IToken[], indent: string): CommentRun {
		const { text, tokens } = this._context.model;

		if (leading.length > 0) {
			return this._existingRun(leading);
		}

		const lineIndent = indentBefore(text, span.start);

		if (lineIndent !== undefined) {
			const start = lineStartOffset(text, span.start);

			return { tokens: [], start, end: start, indent: lineIndent, prefix: '', suffix: '' };
		}

		const previous = tokens[previousNonCommentTokenIndex(tokens, span.startTokenIndex)];

		return { tokens: [], start: tokenEnd(previous), end: span.start, indent, prefix: this._context.style.eol, suffix: indent };
	}

	/**
	 * The run made of comment tokens that are already written, covering their whole lines.
	 * @param comments The comment tokens.
	 * @returns The run.
	 */
	private _existingRun(comments: IToken[]): CommentRun {
		const { text } = this._context.model;
		const first = comments[0];
		const last = comments[comments.length - 1];

		return {
			tokens: comments,
			start: lineStartOffset(text, first.startOffset),
			end: nextLineStartOffset(text, tokenEnd(last)),
			indent: indentBefore(text, first.startOffset) ?? '',
			prefix: '',
			suffix: ''
		};
	}
}

/**
 * The comments of one run among comment lines, the last run when no index is given.
 * @param comments The comment lines.
 * @param index The index of the run.
 * @returns The run, empty when there are no comments.
 * @throws {EditRejectionError} If the lines hold no run of that index.
 */
function _nthRun(comments: IToken[], index: number | undefined): IToken[] {
	const runs = splitCommentRuns(comments);

	if (runs.length === 0) {
		return [];
	}

	const run = runs[index ?? runs.length - 1];

	if (!run) {
		throw new EditRejectionError('notFound', 'The comment is no longer in the document.');
	}

	return run;
}
