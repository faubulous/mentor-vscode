import { IToken, RdfSyntax } from '@faubulous/mentor-rdf-parsers';
import { indentBefore, lineStartOffset } from '@src/utilities/string';
import { TextEditSpec, absorbBlankLine, expandToWholeLines } from '@src/utilities/text-edits';
import { getCommentText, splitCommentRuns, tokenEnd } from '@src/utilities/tokens';
import { CommentRun, CommentRunResolver } from '../comment-run-resolver';
import { EditOperation } from '../edit-operation';
import { EditPlan, createPlan } from '../edit-plan';
import { EditRejectionError } from '../edit-rejection';
import { SynthesisContext } from '../synthesis-context';

type SetCommentOperation = Extract<EditOperation, { op: 'setComment' }>;

type AddCommentOperation = Extract<EditOperation, { op: 'addComment' }>;

/**
 * Writes, rewrites and removes the runs of comment lines of a Turtle document. A line of a
 * comment whose text stays the same keeps how it is written, such as `##` or no space after `#`;
 * other lines are written `# text`, indented like the run. The statements stay the same, so the
 * plans expect no change of them.
 */
export class CommentOperations {
	private readonly _runs: CommentRunResolver;

	/**
	 * Create the operations for one user action.
	 * @param _context The shared state of the action.
	 * @throws {EditRejectionError} If the document is not written in Turtle, whose comments the form
	 * editor reads.
	 */
	constructor(private readonly _context: SynthesisContext) {
		if (_context.input.syntax !== RdfSyntax.Turtle) {
			throw new EditRejectionError({ kind: 'commentsNotSupported' });
		}

		this._runs = new CommentRunResolver(_context);
	}

	/**
	 * Write the lines of the comment at an anchor: they replace the run written there, or are
	 * written where it would stand. No lines remove the run.
	 * @param operation The anchor and the lines.
	 * @returns The plan.
	 * @throws {EditRejectionError} If the anchor names nothing written in the document.
	 */
	setComment(operation: SetCommentOperation): EditPlan {
		const run = this._runs.resolve(operation.at);
		const lines = _trimmedLines(operation.lines);

		if (lines.length === 0) {
			return createPlan({ edits: this._deleteRun(run) });
		}

		return createPlan({ edits: [this._writeRun(run, lines)] });
	}

	/**
	 * Write a comment of its own, a blank line apart from what is around it: before a run of the
	 * comments above a resource, directly above the resource, or at the end of the document.
	 * @param operation Where the comment goes and its lines.
	 * @returns The plan, empty for a comment without lines.
	 * @throws {EditRejectionError} If the resource or its run is not written in the document.
	 */
	addComment(operation: AddCommentOperation): EditPlan {
		const lines = _trimmedLines(operation.lines);

		if (lines.length === 0) {
			return createPlan({});
		}

		if (!operation.before) {
			const runs = splitCommentRuns(this._runs.attribution.documentComments());

			return createPlan({ edits: [this._writeRun(this._runs.resolve({ kind: 'document', run: runs.length }), lines)] });
		}

		return createPlan({ edits: [this._insertBefore(this._positionBefore(operation.before), lines)] });
	}

	/**
	 * Where a comment of its own goes before a run above a resource, or directly above it.
	 * @param before The resource, and the run.
	 * @returns The offset of the line the comment is written above.
	 * @throws {EditRejectionError} If the resource or the run is not written in the document.
	 */
	private _positionBefore(before: NonNullable<AddCommentOperation['before']>): number {
		const attribution = this._runs.attribution;
		const quad = attribution.firstStatementOf(before.subject);

		if (!quad) {
			throw new EditRejectionError({ kind: 'commentGone' });
		}

		if (before.run === undefined) {
			return quad.subjectToken.startOffset;
		}

		const run = splitCommentRuns(attribution.resourceComments(before.subject))[before.run];

		if (!run) {
			throw new EditRejectionError({ kind: 'commentGone' });
		}

		return run[0].startOffset;
	}

	/**
	 * The edit writing a comment of its own above the line holding an offset, a blank line apart
	 * from what is written before and after it.
	 * @param offset The offset.
	 * @param lines The lines of the comment.
	 * @returns The edit.
	 */
	private _insertBefore(offset: number, lines: readonly string[]): TextEditSpec {
		const { text } = this._context.model;
		const { eol } = this._context.style;
		const start = lineStartOffset(text, offset);
		const indent = indentBefore(text, offset) ?? '';
		const before = text.slice(lineStartOffset(text, Math.max(0, start - 1)), start);
		const prefix = start > 0 && before.trim() !== '' ? eol : '';

		return { start, end: start, newText: prefix + _commentLines(lines, indent, eol, []) + eol + eol };
	}

	/**
	 * The edit writing lines into a run, replacing what is written there.
	 * @param run The run.
	 * @param lines The lines of the comment.
	 * @returns The edit.
	 */
	private _writeRun(run: CommentRun, lines: readonly string[]): TextEditSpec {
		const { eol } = this._context.style;

		return { start: run.start, end: run.end, newText: run.prefix + _commentLines(lines, run.indent, eol, run.tokens) + eol + run.suffix };
	}

	/**
	 * The edits removing the lines of a run, and one blank line beside them.
	 * @param run The run.
	 * @returns The edits, none when nothing is written in the run.
	 */
	private _deleteRun(run: CommentRun): TextEditSpec[] {
		if (run.tokens.length === 0) {
			return [];
		}

		const { text } = this._context.model;
		const first = run.tokens[0];
		const last = run.tokens[run.tokens.length - 1];
		const lines = absorbBlankLine(text, expandToWholeLines(text, first.startOffset, tokenEnd(last)));

		return [{ start: lines.start, end: lines.end, newText: '' }];
	}
}

/**
 * Write lines of text as comment lines, joined by line breaks. A line whose text is that of a
 * comment written before keeps how that comment is written.
 * @param lines The lines.
 * @param indent The indentation of each line.
 * @param eol The line break.
 * @param written The comment tokens written before.
 * @returns The text.
 */
function _commentLines(lines: readonly string[], indent: string, eol: string, written: readonly IToken[]): string {
	const unused = [...written];

	return lines.map(line => {
		const index = unused.findIndex(token => getCommentText(token) === line);
		const image = index >= 0 ? unused.splice(index, 1)[0].image.trimEnd() : `# ${line}`.trimEnd();

		return indent + image;
	}).join(eol);
}

/**
 * The lines of a comment without the empty lines that end it, each without its trailing spaces.
 * @param lines The lines.
 * @returns The lines.
 */
function _trimmedLines(lines: readonly string[]): string[] {
	const trimmed = lines.flatMap(line => line.split(/\r?\n/)).map(line => line.trimEnd());

	while (trimmed.length > 0 && trimmed[trimmed.length - 1] === '') {
		trimmed.pop();
	}

	return trimmed;
}
