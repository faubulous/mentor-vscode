import { IToken } from '@faubulous/mentor-rdf-parsers';
import { TextEditSpec } from '@src/utilities/text-edits';
import { isCommentToken, tokenEnd } from '@src/utilities/tokens';
import { isBlank, lineEndOffset, lineStartOffset } from '@src/utilities/string';
import { PredicateGroup, SubjectBlock } from '../statement-model';
import { SynthesisContext } from '../synthesis-context';

/**
 * The place of a predicate group in its block: the text of the group with the comments written
 * above it, and the gap after it up to the next group, or for the last group up to the end of the
 * block, which holds the separator and the comment ending the line of the group.
 */
interface GroupSlot {
	/**
	 * The group.
	 */
	group: PredicateGroup;

	/**
	 * The offset the comments above the group start at, else the group itself.
	 */
	start: number;

	/**
	 * The offset the gap after the group ends at, exclusive.
	 */
	gapEnd: number;

	/**
	 * The comment that ends the line of the last object of the group.
	 */
	lineComment?: IToken;
}

/**
 * Writes the predicate groups of a block in another order. Each group moves with the comments
 * written above it and the comment ending its line; the separators, line breaks and indentation
 * between the groups stay where they are, so the layout of the block does not change.
 */
export class PropertyOrderWriter {
	/**
	 * Create a writer for a block.
	 * @param _context The shared state of the action.
	 * @param _block The block whose groups change their order.
	 */
	constructor(private readonly _context: SynthesisContext, private readonly _block: SubjectBlock) { }

	/**
	 * Write the groups of the block in a new order.
	 * @param order The groups of the block, each once, in their new order.
	 * @returns The edit rewriting the groups from the first to the last that changes its place, or
	 * none when the order stays.
	 */
	write(order: readonly PredicateGroup[]): TextEditSpec[] {
		const groups = this._block.groups;
		const changed = groups.flatMap((group, index) => order[index] !== group ? [index] : []);

		if (changed.length === 0) {
			return [];
		}

		const slots = groups.map((group, index) => this._slotOf(group, index));
		const first = changed[0];
		const last = changed[changed.length - 1];
		const slotOfGroup = new Map(slots.map(slot => [slot.group, slot]));
		const text = this._context.model.text;
		let newText = '';

		for (let index = first; index <= last; index++) {
			const moved = slotOfGroup.get(order[index])!;

			newText += text.slice(moved.start, moved.group.end) + this._gapOf(slots[index], index, moved.lineComment);
		}

		return [{ start: slots[first].start, end: slots[last].gapEnd, newText }];
	}

	/**
	 * Locate the place of a group in the block.
	 * @param group The group.
	 * @param index The index of the group in the block.
	 * @returns The place.
	 */
	private _slotOf(group: PredicateGroup, index: number): GroupSlot {
		const text = this._context.model.text;
		const next = this._block.groups[index + 1];
		const start = group.leadingComments[0]?.startOffset ?? group.start;
		let gapEnd = next ? next.leadingComments[0]?.startOffset ?? next.start : this._blockTailOf();

		const lineComment = this._lineCommentAfter(group);
		const afterBlock = !next && !this._block.nested && lineComment !== undefined && isBlank(text, gapEnd, lineComment.startOffset);
		const ownsComment = lineComment !== undefined && (lineComment.startOffset < gapEnd || afterBlock);

		if (ownsComment && !next) {
			gapEnd = Math.max(gapEnd, tokenEnd(lineComment));
		}

		return { group, start, gapEnd, lineComment: ownsComment ? lineComment : undefined };
	}

	/**
	 * Find the comment on the line the last object of a group ends, after it.
	 * @param group The group.
	 * @returns The comment, or `undefined` when the line has none after the group.
	 */
	private _lineCommentAfter(group: PredicateGroup): IToken | undefined {
		const { text, tokens } = this._context.model;

		for (let index = group.endTokenIndex + 1; index < tokens.length; index++) {
			const token = tokens[index];

			if (text.slice(group.end, token.startOffset).includes('\n')) {
				return undefined;
			}

			if (isCommentToken(token)) {
				return token;
			}
		}

		return undefined;
	}

	/**
	 * The offset the gap after the last group ends at: the closing bracket of a nested block, which
	 * stays, or the end of the period that ends a block at the top level.
	 * @returns The offset.
	 */
	private _blockTailOf(): number {
		const terminator = this._block.terminator;

		if (!terminator) {
			return this._block.end;
		}

		return this._block.nested ? terminator.startOffset : tokenEnd(terminator);
	}

	/**
	 * Write the gap of a place for the group that moves into it: the separator stays, the comment
	 * ending the line of the group that was there goes, and the one of the group that moves in
	 * takes its place, or the end of the line where the place had none. Where nothing ends the line
	 * of the place, a line break is written after the comment, so it hides nothing that follows.
	 * @param slot The place.
	 * @param index The index of the place in the block.
	 * @param comment The comment ending the line of the group that moves in.
	 * @returns The text of the gap.
	 */
	private _gapOf(slot: GroupSlot, index: number, comment: IToken | undefined): string {
		const text = this._context.model.text;
		const gapStart = slot.group.end;

		if (slot.lineComment) {
			const head = text.slice(gapStart, slot.lineComment.startOffset).trimEnd();
			const tail = text.slice(tokenEnd(slot.lineComment), slot.gapEnd);

			return comment ? `${head} ${comment.image}${tail}` : head + tail;
		}

		if (!comment) {
			return text.slice(gapStart, slot.gapEnd);
		}

		const lineEnd = lineEndOffset(text, gapStart);

		if (lineEnd < slot.gapEnd) {
			return `${text.slice(gapStart, lineEnd).trimEnd()} ${comment.image}${text.slice(lineEnd, slot.gapEnd)}`;
		}

		return `${text.slice(gapStart, slot.gapEnd).trimEnd()} ${comment.image}${this._lineBreakAfter(slot, index)}`;
	}

	/**
	 * The line break a comment moved to the end of a place needs where the line goes on after the
	 * gap, with the indentation of what follows it: the next predicate, the closing bracket of a
	 * nested block, or nothing where the line of a block at the top level ends with the block.
	 * @param slot The place.
	 * @param index The index of the place in the block.
	 * @returns The line break, or nothing.
	 */
	private _lineBreakAfter(slot: GroupSlot, index: number): string {
		const { model, style, styleDetector } = this._context;
		const isLast = index === this._block.groups.length - 1;

		if (isLast && !this._block.nested && isBlank(model.text, slot.gapEnd, lineEndOffset(model.text, slot.gapEnd))) {
			return '';
		}

		if (!isLast) {
			return style.eol + styleDetector.predicateIndentFor(this._block);
		}

		return style.eol + (this._block.nested ? _lineIndentOf(model.text, this._block.start) : '');
	}
}

/**
 * The indentation of the line holding an offset.
 * @param text The text.
 * @param offset The offset.
 * @returns The leading spaces and tabs of the line.
 */
function _lineIndentOf(text: string, offset: number): string {
	return /^[ \t]*/.exec(text.slice(lineStartOffset(text, offset)))![0];
}
