import { indentBefore, lineStartOffset } from '@src/utilities/string';
import { TextEditSpec, absorbBlankLine, expandToWholeLines } from '@src/utilities/text-edits';
import { tokenEnd } from '@src/utilities/tokens';
import { CommentRun, CommentRunResolver } from '../comment-run-resolver';
import { EditOperation } from '../edit-operation';
import { EditPlan, createPlan } from '../edit-plan';
import { EditRejectionError } from '../edit-rejection';
import { StatementLocator } from '../statement-locator';
import { SynthesisContext } from '../synthesis-context';
import { TermRef } from '../term-ref';
import { PropertyOperations } from './property-operations';
import { BlockInsertion, SubjectOperations } from './subject-operations';

type SetPropertyCommentsOperation = Extract<EditOperation, { op: 'setPropertyComments' }>;
type SetCommentOperation = Extract<EditOperation, { op: 'setComment' }>;
type AddCommentOperation = Extract<EditOperation, { op: 'addComment' }>;
type DeleteCommentOperation = Extract<EditOperation, { op: 'deleteComment' }>;

/**
 * Writes, rewrites and removes the runs of comment lines of the document.
 */
export class CommentOperations {
	private readonly _runs: CommentRunResolver;

	/**
	 * Create the operations for one user action.
	 * @param _context The shared state of the action.
	 */
	constructor(private readonly _context: SynthesisContext) {
		this._runs = new CommentRunResolver(_context);
	}

	/**
	 * Replace the comment lines above the first statement of a predicate with the given ones, or
	 * remove them when none are given. The focus stays on the predicate the lines introduce.
	 * @param operation The predicate and its comment lines.
	 * @returns The plan.
	 * @throws {EditRejectionError} If the resource does not carry the predicate.
	 */
	setPropertyComments(operation: SetPropertyCommentsOperation): EditPlan {
		const { group } = new PropertyOperations(this._context).findPredicateGroups(operation.subject, operation.predicate)[0];
		const run = this._runs.resolve({ kind: 'property', subject: operation.subject, predicate: operation.predicate });
		const lines = operation.comments.flatMap(_linesOf);
		const edits = lines.length > 0 ? [this._writeRun(run, lines)] : this._deleteRun(run);
		const edit = edits[0];

		return createPlan({
			edits,
			focus: edit ? { edit, offsetWithin: edit.newText.length + (group.start - edit.end), target: 'predicate' } : undefined
		});
	}

	/**
	 * Write the comment at an anchor: the run of lines it names is replaced, or written where it
	 * would stand. An empty text removes it.
	 * @param operation The anchor and the text.
	 * @returns The plan.
	 * @throws {EditRejectionError} If the anchor points at nothing in the document.
	 */
	setComment(operation: SetCommentOperation): EditPlan {
		if (operation.text.trim() === '') {
			return this.deleteComment({ op: 'deleteComment', at: operation.at });
		}

		const run = this._runs.resolve(operation.at);
		const edit = this._writeRun(run, _linesOf(operation.text));

		return createPlan({ edits: [edit], focus: { edit, offsetWithin: run.prefix.length + run.indent.length, target: 'comment' } });
	}

	/**
	 * Write a comment block of the document: after the block of a resource, before it, or at the
	 * end of the document when neither is named.
	 * @param operation Where the block goes and its text.
	 * @returns The plan.
	 * @throws {EditRejectionError} If the resource named is not written in the document.
	 */
	addComment(operation: AddCommentOperation): EditPlan {
		const lines = _linesOf(operation.text);

		if (operation.before && !operation.after) {
			return this._addCommentBefore(operation.before, lines);
		}

		const subjects = new SubjectOperations(this._context);
		const insertion = operation.after ? subjects.afterBlockInsertion(operation.after) : subjects.documentEndInsertion();

		return this._insertBlock(insertion, lines);
	}

	/**
	 * Remove the comment at an anchor: the whole lines of its run, with one blank line beside it.
	 * @param operation The anchor.
	 * @returns The plan.
	 * @throws {EditRejectionError} If there is no comment at the anchor.
	 */
	deleteComment(operation: DeleteCommentOperation): EditPlan {
		const edits = this._deleteRun(this._runs.resolve(operation.at));

		if (edits.length === 0) {
			throw new EditRejectionError('notFound', 'There is no comment to remove.');
		}

		return createPlan({ edits });
	}

	/**
	 * Write a comment block above the block of a resource, a blank line apart from it.
	 * @param before The resource.
	 * @param lines The lines of the comment.
	 * @returns The plan.
	 * @throws {EditRejectionError} If the resource is not written in the document.
	 */
	private _addCommentBefore(before: TermRef, lines: string[]): EditPlan {
		const { text } = this._context.model;
		const { eol } = this._context.style;
		const block = new StatementLocator(this._context.model).blocksOf(before).find(candidate => !candidate.nested);

		if (!block) {
			throw new EditRejectionError('notFound', 'The resource to add before is not written in the document.');
		}

		const indent = indentBefore(text, block.start) ?? '';
		const start = lineStartOffset(text, block.leadingComments[0]?.startOffset ?? block.start);
		const edit = { start, end: start, newText: _commentLines(lines, indent, eol) + eol + eol };

		return createPlan({ edits: [edit], focus: { edit, offsetWithin: indent.length, target: 'comment' } });
	}

	/**
	 * Write a comment block where a block of text goes.
	 * @param insertion Where the block goes.
	 * @param lines The lines of the comment.
	 * @returns The plan.
	 */
	private _insertBlock(insertion: BlockInsertion, lines: string[]): EditPlan {
		const edit = { start: insertion.start, end: insertion.end, newText: insertion.prefix + _commentLines(lines, '', this._context.style.eol) + insertion.suffix };

		return createPlan({ edits: [edit, ...insertion.extraEdits], focus: { edit, offsetWithin: insertion.prefix.length, target: 'comment' } });
	}

	/**
	 * The edit writing lines into a run, replacing what is written there.
	 * @param run The run.
	 * @param lines The lines of the comment.
	 * @returns The edit.
	 */
	private _writeRun(run: CommentRun, lines: string[]): TextEditSpec {
		const { eol } = this._context.style;

		return { start: run.start, end: run.end, newText: run.prefix + _commentLines(lines, run.indent, eol) + eol + run.suffix };
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
 * Write lines of text as comment lines, joined by line breaks.
 * @param lines The lines.
 * @param indent The indentation of each line.
 * @param eol The line break.
 * @returns The text.
 */
function _commentLines(lines: string[], indent: string, eol: string): string {
	return lines.map(line => `${indent}# ${line}`.trimEnd()).join(eol);
}

/**
 * Split a text into its lines.
 * @param text The text.
 * @returns The lines.
 */
function _linesOf(text: string): string[] {
	return text.split(/\r?\n/);
}
