import { RdfToken } from '@faubulous/mentor-rdf-parsers';
import { TermRef } from '../term-ref';
import { EditPlan, QuadExpectation, createPlan } from '../edit-plan';
import { EditRejectionError } from '../edit-rejection';
import { ObjectSpan, PredicateGroup, SubjectBlock } from '../statement-model';
import { PropertyOperations } from './property-operations';
import { ResolvedValue, StatementLocator, ValueLocation } from '../statement-locator';
import { toTermRef } from '../resource-id';
import { deleteRange, expandToWholeLines } from '@src/utilities/text-edits';
import { countStatementsWithin } from '@src/utilities/quad-contexts';
import { SynthesisContext } from '../synthesis-context';
import { toPatternFromRef, toTermPattern } from '../term-patterns';
import { isTokenOfType, nextNonCommentTokenIndex, previousNonCommentTokenIndex, tokenEnd } from '@src/utilities/tokens';

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
 * Build the expectation that a value of a block changes in number.
 */
function _expectation(block: SubjectBlock, group: PredicateGroup, span: ObjectSpan, delta: number): QuadExpectation {
	return {
		subject: toPatternFromRef(toTermRef(block.subject)),
		predicate: group.predicateIri,
		object: toTermPattern(span.quad.object),
		delta
	};
}

/**
 * The value and group edits the other operations build on: appending a value, deleting a value, a run of groups or a block.
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
	 */
	deleteValue(location: ValueLocation): EditPlan {
		const context = this._context;

		const resolved = new StatementLocator(context.model).valueAt(location);
		const { block, group, span } = resolved;
		const range = group.objects.length > 1
			? this._valueDeletionRange(resolved)
			: this._groupDeletionRange(block, group);
		const { text, tokens, quadContexts } = context.model;
		const lines = expandToWholeLines(text, range.start, range.end);

		return createPlan({
			edits: deleteRange(text, tokens, lines.start, lines.end),
			expectations: [_expectation(block, group, span, -1)],
			quadCountDelta: -1 - countStatementsWithin(quadContexts, span.start, span.end)
		});
	}

	/**
	 * Insert already written text as a further value of a predicate: after the last value when the
	 * subject carries the predicate, as a new predicate otherwise. The plan carries the edit and the
	 * focus; the caller adds what the text means in statements.
	 * @param subject The subject the value belongs to.
	 * @param predicate The predicate the value belongs to.
	 * @param written The value as it is to appear in the text.
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
	 * The range removing a predicate with its only value, including the semicolon that joins it to
	 * the neighbouring predicate.
	 */
	private _groupDeletionRange(block: SubjectBlock, group: PredicateGroup): { start: number; end: number } {
		const context = this._context;

		const { tokens } = context.model;
		const index = block.groups.indexOf(group);

		if (block.groups.length === 1) {
			return this._onlyGroupDeletionRange(block, group);
		}

		if (index < block.groups.length - 1) {
			const semicolon = nextNonCommentTokenIndex(tokens, group.endTokenIndex);
			const next = block.groups[index + 1];

			return { start: group.start, end: isTokenOfType(tokens[semicolon], RdfToken.SEMICOLON.name) ? next.start : tokenEnd(tokens[group.endTokenIndex]) };
		}

		const previous = block.groups[index - 1];

		return { start: previous.end, end: group.end };
	}

	/**
	 * The ranges removing several groups of a block. Neighbouring removed groups form one range, so
	 * that the ranges never overlap and the separators between them go with them.
	 * @param block The block the groups belong to.
	 * @param removed The groups to remove.
	 */
	groupRunDeletionRanges(block: SubjectBlock, removed: readonly PredicateGroup[]): { start: number; end: number }[] {
		if (removed.length === block.groups.length) {
			return [this._onlyGroupDeletionRange(block, block.groups[0])];
		}

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
	 * The range removing the only predicate of a block. Inside a blank node the brackets stay, so
	 * the node survives as `[ ]`; a top level subject with another block loses this one; otherwise
	 * the deletion would remove the subject and is refused.
	 */
	private _onlyGroupDeletionRange(block: SubjectBlock, group: PredicateGroup): { start: number; end: number } {
		const context = this._context;

		if (block.nested) {
			return { start: group.start, end: block.end };
		}

		const siblings = context.model.blocksBySubject.get(block.subjectId) ?? [];

		if (siblings.length > 1) {
			return this.blockDeletionRange(block);
		}

		throw new EditRejectionError('wouldRemoveSubject', 'This is the last statement about the resource. Delete the resource to remove it.');
	}

	/**
	 * The range removing a whole top level block including its terminator.
	 * @param block The block to remove.
	 */
	blockDeletionRange(block: SubjectBlock): { start: number; end: number } {
		const end = block.terminator ? tokenEnd(block.terminator) : block.end;

		return { start: block.start, end };
	}
}
