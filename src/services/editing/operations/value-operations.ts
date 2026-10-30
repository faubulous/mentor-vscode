import { RdfToken } from '@faubulous/mentor-rdf-parsers';
import { TermRef } from '../term-ref';
import { EditPlan, ExpectedStatementChange, TermPattern, createPlan } from '../edit-plan';
import { EditRejectionError } from '../edit-rejection';
import { ObjectSpan, PredicateGroup, SubjectBlock } from '../statement-model';
import { PropertyOperations } from './property-operations';
import { ResolvedValue, StatementLocator, ValueLocation } from '../statement-locator';
import { toTermRef } from '../resource-id';
import { TextEditSpec, absorbBlankLine, deleteRange, expandToWholeLines, mergeRanges } from '@src/utilities/text-edits';
import { statementsWithin } from '@src/utilities/quad-contexts';
import { SynthesisContext } from '../synthesis-context';
import { toPatternFromRef, toTermPattern } from '../term-patterns';
import { isCommentToken, isTokenOfType, previousNonCommentTokenIndex, tokenEnd } from '@src/utilities/tokens';

/**
 * The range removing the groups from one index to another: up to the start of the following
 * group, or from the end of the preceding group when the run ends the block.
 */
function _runDeletionRange(block: SubjectBlock, from: number, to: number): { start: number; end: number } {
	const next = block.groups[to + 1];

	if (next) {
		return { start: block.groups[from].start, end: next.start };
	}

	return { start: block.groups[from - 1].end, end: block.groups[to].end };
}

/**
 * The value and group edits the other operations build on: appending a value, deleting a value,
 * groups of the blocks of a subject, or blocks.
 */
export class ValueOperations {
	/**
	 * Create the operations of one user action.
	 * @param _context The shared state of the action.
	 */
	constructor(private readonly _context: SynthesisContext) { }

	/**
	 * Remove a value. The punctuation around it is removed with it, and a predicate that loses its
	 * only value goes as well. The last statement of a subject is not removed silently: the webview
	 * has to ask for the subject to be deleted.
	 * @param location The value to remove.
	 * @returns The plan removing the value.
	 * @throws {EditRejectionError} If the value is not found, or is the last statement about the subject.
	 */
	deleteValue(location: ValueLocation): EditPlan {
		const context = this._context;

		const resolved = new StatementLocator(context.model).valueAt(location);
		const { block, group, span } = resolved;
		const edits = group.objects.length > 1
			? this._lineDeletions(this._valueDeletionRange(resolved))
			: this.groupDeletions(new Map([[block, [group]]]));

		return createPlan({
			edits,
			expectedChanges: this.removalChanges(toPatternFromRef(toTermRef(block.subject)), group.predicateIri, span)
		});
	}

	/**
	 * The statements a written value takes with it when it goes: its own, and those of the blank
	 * nodes and lists written inside it.
	 * @param subject The subject of the statement.
	 * @param predicate The predicate of the statement.
	 * @param span The value.
	 * @returns The expected changes.
	 */
	removalChanges(subject: TermPattern, predicate: string, span: ObjectSpan): ExpectedStatementChange[] {
		const nested = statementsWithin(this._context.model.quadContexts, span.start, span.end).map(inner => ({
			subject: toTermPattern(inner.subject),
			predicate: inner.predicate.value,
			object: toTermPattern(inner.object),
			delta: -1
		}));

		return [{ subject, predicate, object: toTermPattern(span.quad.object), delta: -1 }, ...nested];
	}

	/**
	 * Insert already written text as a further value of a predicate: after the last value when the
	 * subject carries the predicate, as a new predicate otherwise. The plan carries the edit and the
	 * focus; the caller adds what the text means in statements.
	 * @param subject The subject the value belongs to.
	 * @param predicate The predicate the value belongs to.
	 * @param written The value as it is to appear in the text.
	 * @returns The plan inserting the value.
	 * @throws {EditRejectionError} If the subject has no block in the document.
	 */
	appendWrittenValue(subject: TermRef, predicate: string, written: string): EditPlan {
		const context = this._context;

		const target = this._findLastGroup(subject, predicate);

		if (!target) {
			return new PropertyOperations(context).newProperty(subject, predicate, written);
		}

		const { block, group } = target;
		const last = group.objects[group.objects.length - 1];
		const separator = context.styleDetector.objectsOnePerLine(group)
			? `,${context.style.eol}${context.styleDetector.objectIndentFor(block, group)}`
			: ', ';
		const edit = { start: last.end, end: last.end, newText: separator + written };

		return createPlan({
			edits: [edit],
			focus: { edit, offsetWithin: separator.length, target: 'value' }
		});
	}

	/**
	 * Find the last group of a predicate across the blocks of a subject.
	 * @param subject The subject whose groups to search.
	 * @param predicate The predicate of the group.
	 * @returns The group with its block, or `undefined` when the subject does not carry the predicate.
	 */
	private _findLastGroup(subject: TermRef, predicate: string): { block: SubjectBlock; group: PredicateGroup } | undefined {
		const context = this._context;

		let found: { block: SubjectBlock; group: PredicateGroup } | undefined;

		for (const block of context.model.blocksBySubject.get(subject.kind === 'bnode' ? `b:${subject.id}` : subject.kind === 'iri' ? `i:${subject.iri}` : '') ?? []) {
			for (const group of block.groups) {
				if (group.predicateIri === predicate) {
					found = { block, group };
				}
			}
		}

		return found;
	}

	/**
	 * The range removing one value of several: the value with the comma that joins it to its
	 * neighbour, so the remaining values stay a well formed list.
	 * @param resolved The value to remove.
	 * @returns The range.
	 */
	private _valueDeletionRange(resolved: ResolvedValue): { start: number; end: number } {
		const context = this._context;

		const { group, span, indexInGroup } = resolved;
		const { tokens } = context.model;

		if (indexInGroup < group.objects.length - 1) {
			return { start: span.start, end: group.objects[indexInGroup + 1].start };
		}

		const comma = previousNonCommentTokenIndex(tokens, span.startTokenIndex);
		const previous = group.objects[indexInGroup - 1];

		return { start: isTokenOfType(tokens[comma], RdfToken.COMMA.name) ? Math.min(previous.end, tokens[comma].startOffset) : previous.end, end: span.end };
	}

	/**
	 * Remove groups of the blocks of a subject, as one edit removes them. Neighbouring groups of a
	 * block go as one range, so the ranges never overlap and the separators between them go too. A
	 * blank node written in brackets that loses all its groups stays as `[ ]`. Any other block that
	 * loses all its groups goes as a whole, as {@link blockDeletions} removes it, while another
	 * block of its subject keeps a statement; the blocks are judged together, so an edit cannot
	 * remove a subject by emptying its blocks one by one.
	 * @param removed The groups that go, by the block holding them.
	 * @returns The deletions.
	 * @throws {EditRejectionError} If no statement about a subject would be left.
	 */
	groupDeletions(removed: ReadonlyMap<SubjectBlock, readonly PredicateGroup[]>): TextEditSpec[] {
		const edits: TextEditSpec[] = [];
		const emptied: SubjectBlock[] = [];

		for (const [block, groups] of removed) {
			if (groups.length < block.groups.length) {
				edits.push(...this._groupRunRanges(block, groups).flatMap(range => this._lineDeletions(range)));
			} else if (block.nested) {
				edits.push(...this._lineDeletions({ start: block.groups[0].start, end: block.end }));
			} else {
				emptied.push(block);
			}
		}

		this._requireSubjectsKept(emptied);

		return [...edits, ...this.blockDeletions(emptied)];
	}

	/**
	 * Remove top level blocks as a whole: each with the comment lines written directly above it, its
	 * terminator and the comment that ends its last line. A blank line that separated a removed block
	 * from its neighbours goes with it, so the blocks that stay keep one blank line between them.
	 * @param blocks The blocks.
	 * @returns The deletions, one per run of neighbouring blocks.
	 */
	blockDeletions(blocks: readonly SubjectBlock[]): TextEditSpec[] {
		const { text } = this._context.model;
		const lines = blocks.map(block => {
			const range = this._blockRange(block);

			return expandToWholeLines(text, range.start, range.end);
		});

		// Neighbouring blocks may both take the blank line between them; once merged, a run that ends
		// the document takes the blank line before it instead.
		const merged = mergeRanges(mergeRanges(lines).map(range => absorbBlankLine(text, range)));

		return merged.map(range => range.end >= text.length ? absorbBlankLine(text, range) : range).map(range => ({ ...range, newText: '' }));
	}

	/**
	 * The range of a block with the comment lines written directly above it, without a blank line in
	 * between, its terminator, and the comment that ends its last line.
	 * @param block The block.
	 * @returns The range.
	 */
	private _blockRange(block: SubjectBlock): { start: number; end: number } {
		const { text, tokens } = this._context.model;
		const terminatorEnd = block.terminator ? tokenEnd(block.terminator) : block.end;
		const trailing = tokens.find(token => isCommentToken(token) && token.startOffset >= terminatorEnd);
		const end = trailing && !text.slice(terminatorEnd, trailing.startOffset).includes('\n') ? tokenEnd(trailing) : terminatorEnd;
		let start = block.start;

		for (let index = block.leadingComments.length - 1; index >= 0; index--) {
			const comment = block.leadingComments[index];

			if (!/^[ \t]*\r?\n[ \t]*$/.test(text.slice(tokenEnd(comment), start))) {
				break;
			}

			start = comment.startOffset;
		}

		return { start, end };
	}

	/**
	 * Require every subject whose blocks are emptied to keep a statement in another block.
	 * @param emptied The top level blocks that lose all their groups.
	 * @throws {EditRejectionError} If no statement about a subject would be left.
	 */
	private _requireSubjectsKept(emptied: readonly SubjectBlock[]): void {
		const { blocksBySubject } = this._context.model;
		const removed = new Set(emptied);

		for (const block of emptied) {
			const siblings = blocksBySubject.get(block.subjectId) ?? [block];

			if (siblings.every(sibling => removed.has(sibling))) {
				throw new EditRejectionError('wouldRemoveSubject', 'These are the last statements about the resource. Delete the resource to remove it.');
			}
		}
	}

	/**
	 * The ranges removing some of the groups of a block. Neighbouring removed groups form one range,
	 * so that the ranges never overlap and the separators between them go with them.
	 * @param block The block the groups belong to.
	 * @param removed The groups to remove, fewer than the block has.
	 * @returns The ranges in document order.
	 */
	private _groupRunRanges(block: SubjectBlock, removed: readonly PredicateGroup[]): { start: number; end: number }[] {
		const removedSet = new Set(removed);
		const ranges: { start: number; end: number }[] = [];
		let runStart: number | undefined;

		block.groups.forEach((group, index) => {
			const isRemoved = removedSet.has(group);
			const next = block.groups[index + 1];

			if (isRemoved && runStart === undefined) {
				runStart = index;
			}

			if (runStart !== undefined && (!next || !removedSet.has(next))) {
				ranges.push(_runDeletionRange(block, runStart, index));
				runStart = undefined;
			}
		});

		return ranges;
	}

	/**
	 * Delete a range, widened to whole lines where nothing else would remain on them, keeping the
	 * comments written inside it.
	 * @param range The range.
	 * @returns The deletions.
	 */
	private _lineDeletions(range: { start: number; end: number }): TextEditSpec[] {
		const { text, tokens } = this._context.model;
		const lines = expandToWholeLines(text, range.start, range.end);

		return deleteRange(text, tokens, lines.start, lines.end);
	}
}
