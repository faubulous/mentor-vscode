import { IToken } from '@faubulous/mentor-rdf-parsers';
import { BlankNode, NamedNode } from '@rdfjs/types';
import { CommentAttribution } from '@src/services/resource/comment-attribution';
import { indentBefore, lineStartOffset, nextLineStartOffset } from '@src/utilities/string';
import { previousNonCommentTokenIndex, splitCommentRuns, tokenEnd } from '@src/utilities/tokens';
import { CommentAnchor } from './comment-anchor';
import { EditRejectionError } from './edit-rejection';
import { StatementLocator } from './statement-locator';
import { SynthesisContext } from './synthesis-context';

/**
 * A run of comment lines in the document, or the place where one would be written.
 */
export interface CommentRun {
	/**
	 * The comment tokens of the run, in order; empty when nothing is written there yet.
	 */
	tokens: readonly IToken[];

	/**
	 * The offset the whole lines of the run start at, or the start of the range a new run replaces.
	 */
	start: number;

	/**
	 * The offset the whole lines of the run end at, exclusive, or the end of the range a new run
	 * replaces.
	 */
	end: number;

	/**
	 * The indentation of the lines of the run.
	 */
	indent: string;

	/**
	 * What goes before the lines, where they are written into a line holding other content.
	 */
	prefix: string;

	/**
	 * What goes after the lines, where they are written into a line holding other content.
	 */
	suffix: string;
}

/**
 * Locates the run of comment lines an anchor names, or the place where one would be written, by
 * the rules the form shows the comments by ({@link CommentAttribution}).
 */
export class CommentRunResolver {
	/**
	 * What each comment line of the document is written about.
	 */
	readonly attribution: CommentAttribution;

	/**
	 * Create a resolver for one user action.
	 * @param _context The shared state of the action.
	 */
	constructor(private readonly _context: SynthesisContext) {
		this.attribution = new CommentAttribution(_context.input.quadContexts, _context.model.tokens);
	}

	/**
	 * Locate the run an anchor names.
	 * @param anchor The anchor.
	 * @returns The run.
	 * @throws {EditRejectionError} If the anchor names nothing written in the document.
	 */
	resolve(anchor: CommentAnchor): CommentRun {
		const attribution = this.attribution;

		switch (anchor.kind) {
			case 'resource': {
				const quad = this._found(attribution.firstStatementOf(anchor.subject));

				return this._runOf(_nthRun(attribution.resourceComments(anchor.subject), anchor.run), quad.subjectToken, () => '');
			}
			case 'node': {
				const quad = this._found(attribution.firstStatementOf(anchor.subject));

				return this._runOf(attribution.resourceComments(anchor.subject), quad.predicateToken, () => this._indentOf(anchor.subject, quad.predicateToken.startOffset, false));
			}
			case 'property': {
				const quad = this._found(attribution.firstStatementOfProperty(anchor.subject, anchor.predicate));

				return this._runOf(attribution.propertyComments(anchor.subject, anchor.predicate), quad.predicateToken, () => this._indentOf(anchor.subject, quad.predicateToken.startOffset, false));
			}
			case 'value': {
				const quad = this._found(this._context.input.quadContexts.find(candidate =>
					candidate.subject.equals(anchor.subject) && candidate.predicate.value === anchor.predicate && candidate.objectToken.startOffset === anchor.anchor));

				return this._runOf(attribution.valueComments(anchor.subject, anchor.predicate, anchor.anchor), quad.objectToken, () => this._indentOf(anchor.subject, anchor.anchor, true));
			}
			case 'end':
				return this._endRun(anchor.subject);
			default:
				return this._documentRun(anchor.run);
		}
	}

	/**
	 * The run of the comments ending the statements of a resource, or the place before the `.` or
	 * `]` that closes its last block where a new one is written: the start of the line of that
	 * token, where it starts the line, or else a line break before it, so it moves onto a line of
	 * its own below the comment. The lines are indented as the predicates of the block.
	 * @param subject The resource.
	 * @returns The run.
	 * @throws {EditRejectionError} If the resource has no closed block in the document.
	 */
	private _endRun(subject: NamedNode | BlankNode): CommentRun {
		const comments = this.attribution.endComments(subject);

		if (comments.length > 0) {
			return this._existingRun(comments);
		}

		const block = this._found(new StatementLocator(this._context.model).blocksOf(subject).filter(candidate => candidate.terminator).pop());
		const terminator = block.terminator!;
		const indent = this._context.styleDetector.predicateIndentFor(block);
		const { text, tokens } = this._context.model;

		if (indentBefore(text, terminator.startOffset) !== undefined) {
			const start = lineStartOffset(text, terminator.startOffset);

			return { tokens: [], start, end: start, indent, prefix: '', suffix: '' };
		}

		const index = tokens.findIndex(token => token.startOffset === terminator.startOffset);
		const previous = tokens[previousNonCommentTokenIndex(tokens, index)];

		return { tokens: [], start: tokenEnd(previous), end: terminator.startOffset, indent, prefix: this._context.style.eol, suffix: _lineIndentOf(text, block.start) };
	}

	/**
	 * The run of the comments closing the document with an index, or the place after them where a
	 * new one is written.
	 * @param run The index of the run.
	 * @returns The run.
	 * @throws {EditRejectionError} If there is neither such a run nor the place of the next one.
	 */
	private _documentRun(run: number): CommentRun {
		const runs = splitCommentRuns(this.attribution.documentComments());

		if (runs[run]) {
			return this._existingRun(runs[run]);
		}

		if (run !== runs.length) {
			throw new EditRejectionError({ kind: 'commentGone' });
		}

		const { text } = this._context.model;
		const { eol } = this._context.style;
		const end = text.length;

		return { tokens: [], start: end, end, indent: '', prefix: _endOfTextPrefix(text, eol), suffix: '' };
	}

	/**
	 * The run made of the given comments, or the place above a term where they would be written.
	 * @param comments The comment tokens, none when nothing is written yet.
	 * @param target The token of the term the comments stand above.
	 * @param indentOf The indentation of lines written before the term where it does not start its
	 * line, which then moves onto a line of its own.
	 * @returns The run.
	 */
	private _runOf(comments: readonly IToken[], target: IToken, indentOf: () => string): CommentRun {
		return comments.length > 0 ? this._existingRun(comments) : this._runAbove(target, indentOf);
	}

	/**
	 * The indentation a term of a resource takes on a line of its own, as the block writes it: a
	 * predicate as the predicates of the block, an object as the objects of its predicate.
	 * @param subject The resource.
	 * @param offset The offset the term is written at.
	 * @param isObject Whether the term is an object.
	 * @returns The indentation.
	 */
	private _indentOf(subject: NamedNode | BlankNode, offset: number, isObject: boolean): string {
		const detector = this._context.styleDetector;
		const block = new StatementLocator(this._context.model).blocksOf(subject).find(candidate => candidate.start <= offset && offset <= candidate.end);
		const group = block?.groups.find(candidate => candidate.start <= offset && offset <= candidate.end);

		if (!block) {
			return this._context.style.predicateIndent;
		}

		return isObject && group ? detector.objectIndentFor(block, group) : detector.predicateIndentFor(block);
	}

	/**
	 * The place above a term where new comment lines are written: the start of its line, where it
	 * starts the line, or else a line break before it, so it moves onto a line of its own below them.
	 * @param target The token of the term.
	 * @param indentOf The indentation of the lines and the term where the term moves.
	 * @returns The run, without tokens.
	 */
	private _runAbove(target: IToken, indentOf: () => string): CommentRun {
		const { text, tokens } = this._context.model;
		const lineIndent = indentBefore(text, target.startOffset);

		if (lineIndent !== undefined) {
			const start = lineStartOffset(text, target.startOffset);

			return { tokens: [], start, end: start, indent: lineIndent, prefix: '', suffix: '' };
		}

		const index = tokens.findIndex(token => token.startOffset === target.startOffset);
		const previous = tokens[previousNonCommentTokenIndex(tokens, index)];
		const indent = indentOf();

		return { tokens: [], start: tokenEnd(previous), end: target.startOffset, indent, prefix: this._context.style.eol, suffix: indent };
	}

	/**
	 * The run made of comment tokens that are written, covering their whole lines.
	 * @param comments The comment tokens.
	 * @returns The run.
	 */
	private _existingRun(comments: readonly IToken[]): CommentRun {
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

	/**
	 * The statement an anchor names, which must be written.
	 * @param quad The statement, if found.
	 * @returns The statement.
	 * @throws {EditRejectionError} If it is not.
	 */
	private _found<T>(quad: T | undefined): T {
		if (!quad) {
			throw new EditRejectionError({ kind: 'commentGone' });
		}

		return quad;
	}
}

/**
 * The comments of one run among comment lines; none, where there are none and the first run is
 * asked for, as it is written anew.
 * @param comments The comment lines.
 * @param run The index of the run.
 * @returns The comments of the run.
 * @throws {EditRejectionError} If the lines hold no run of that index.
 */
function _nthRun(comments: readonly IToken[], run: number): readonly IToken[] {
	const runs = splitCommentRuns(comments);

	if (runs.length === 0 && run === 0) {
		return [];
	}

	if (!runs[run]) {
		throw new EditRejectionError({ kind: 'commentGone' });
	}

	return runs[run];
}

/**
 * The indentation of the line holding an offset.
 * @param text The text.
 * @param offset The offset.
 * @returns The whitespace that starts the line.
 */
function _lineIndentOf(text: string, offset: number): string {
	const start = lineStartOffset(text, offset);

	return /^[ \t]*/.exec(text.slice(start, offset))![0];
}

/**
 * What goes before a run written at the end of a text: a line break where the text does not end
 * its last line, and a blank line where it holds anything.
 * @param text The text.
 * @param eol The line break.
 * @returns The prefix.
 */
function _endOfTextPrefix(text: string, eol: string): string {
	if (text.trim() === '') {
		return '';
	}

	return (text.endsWith('\n') ? '' : eol) + (/\n[ \t]*\r?\n$/.test(text) ? '' : eol);
}
