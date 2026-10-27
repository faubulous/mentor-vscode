import { EditOperation } from '../edit-operation';
import { TermRef } from '../term-ref';
import { EditPlan, createPlan } from '../edit-plan';
import { EditRejectionError } from '../edit-rejection';
import { PredicateGroup, SubjectBlock } from '../statement-model';
import { ValueOperations } from './value-operations';
import { StatementLocator } from '../statement-locator';
import { deleteRange, expandToWholeLines } from '@src/utilities/text-edits';
import { countStatementsWithin } from '@src/utilities/quad-contexts';
import { SynthesisContext } from '../synthesis-context';
import { toPatternFromRef, toTermPattern } from '../term-patterns';

/**
 * The `deleteProperty` operation of the edit contract.
 */
type DeletePropertyOperation = Extract<EditOperation, { op: 'deleteProperty' }>;

/**
 * The `moveProperty` operation of the edit contract.
 */
type MovePropertyOperation = Extract<EditOperation, { op: 'moveProperty' }>;

/**
 * The offset of a group within the rewritten run of groups.
 * @param texts The texts of the groups in their new order.
 * @param separators The separators between the groups.
 * @param index The index of the group.
 * @returns The offset of the group in the joined text.
 */
function _offsetOfGroup(texts: readonly string[], separators: readonly string[], index: number): number {
	let offset = 0;

	for (let position = 0; position < index; position++) {
		offset += texts[position].length + separators[position].length;
	}

	return offset;
}

/**
 * Adds, moves and deletes the predicates of a subject.
 */
export class PropertyOperations {
	/**
	 * Create the operations of one user action.
	 * @param _context The shared state of the action.
	 */
	constructor(private readonly _context: SynthesisContext) { }

	/**
	 * Add a statement with a predicate the subject does not carry yet, after its last predicate. A
	 * nested block written on one line stays on one line; anything else puts the predicate on a line
	 * of its own, indented like its neighbours. A predicate the subject already carries is handled by
	 * the value operations, which append to its list instead.
	 * @param subject The subject to add the predicate to.
	 * @param predicateIri The IRI of the predicate.
	 * @param written The values as they are to appear in the text.
	 * @returns The plan inserting the statement.
	 * @throws {EditRejectionError} If the subject has no block in the document.
	 */
	newProperty(subject: TermRef, predicateIri: string, written: string): EditPlan {
		const context = this._context;

		const blocks = new StatementLocator(context.model).blocksOf(subject);
		const block = blocks.find(candidate => candidate.nested) ?? blocks[blocks.length - 1];
		const predicate = context.writer.writePredicate(predicateIri);
		const separator = this._separator(block);
		const edit = { start: block.end, end: block.end, newText: `${separator}${predicate} ${written}` };

		return createPlan({
			edits: [edit],
			focus: { edit, offsetWithin: separator.length + predicate.length + 1, target: 'value' }
		});
	}

	/**
	 * The text between the last statement of a block and a new predicate.
	 * @param block The block the predicate goes into.
	 * @returns The separator text.
	 */
	private _separator(block: SubjectBlock): string {
		const context = this._context;

		if (block.nested && context.styleDetector.isSingleLineBlock(block)) {
			return ' ; ';
		}

		return ` ;${context.style.eol}${context.styleDetector.predicateIndentFor(block)}`;
	}

	/**
	 * Move a predicate with its values to stand before another predicate of the subject, or after the
	 * last one. The groups of the block are rewritten in their new order while every separator between
	 * them stays where it was, so a block written one predicate per line keeps its lines and its
	 * indentation. No statement changes, so nothing is expected of the result beyond parsing.
	 * @param operation The predicate to move and where to.
	 * @returns The plan rewriting the groups, or an empty plan when nothing moves.
	 * @throws {EditRejectionError} If the subject does not write the predicates in one block.
	 */
	moveProperty(operation: MovePropertyOperation): EditPlan {
		const context = this._context;

		const block = this._blockHolding(operation.subject, operation.predicate, operation.before);
		const groups = block.groups;
		const from = groups.findIndex(group => group.predicateIri === operation.predicate);
		const target = operation.before === undefined ? groups.length : groups.findIndex(group => group.predicateIri === operation.before);
		const to = target > from ? target - 1 : target;

		if (from === to) {
			return createPlan({});
		}

		const { text } = context.model;
		const texts = groups.map(group => text.slice(group.start, group.end));
		const separators = groups.slice(1).map((group, index) => text.slice(groups[index].end, group.start));
		const [moved] = texts.splice(from, 1);

		texts.splice(to, 0, moved);

		const newText = texts.map((group, index) => (index > 0 ? separators[index - 1] : '') + group).join('');
		const edit = { start: groups[0].start, end: groups[groups.length - 1].end, newText };

		return createPlan({
			edits: [edit],
			focus: { edit, offsetWithin: _offsetOfGroup(texts, separators, to), target: 'predicate' }
		});
	}

	/**
	 * The one block of the subject that writes both predicates, or the predicate alone when it is
	 * moved to the end. A move stays within a block: it rearranges how one place is written.
	 * @param subject The subject whose block to find.
	 * @param predicate The predicate to move.
	 * @param before The predicate to move it before, if any.
	 * @returns The block.
	 * @throws {EditRejectionError} If no block of the subject carries the predicates.
	 */
	private _blockHolding(subject: TermRef, predicate: string, before: string | undefined): SubjectBlock {
		const context = this._context;

		const carries = (block: SubjectBlock, iri: string) => block.groups.some(group => group.predicateIri === iri);
		const block = new StatementLocator(context.model).blocksOf(subject)
			.find(candidate => carries(candidate, predicate) && (before === undefined || carries(candidate, before)));

		if (!block) {
			throw new EditRejectionError('notFound', 'The resource does not write these predicates in one place.');
		}

		return block;
	}

	/**
	 * Remove a predicate with all its values from every block of the subject. Neighbouring removed
	 * groups are deleted as one range so their ranges never overlap; a block that loses all its
	 * groups follows the rules for deleting a lone value.
	 * @param operation The predicate to remove.
	 * @returns The plan removing the groups.
	 * @throws {EditRejectionError} If the subject does not carry the predicate, or the predicate holds the last statement about the subject.
	 */
	deleteProperty(operation: DeletePropertyOperation): EditPlan {
		const context = this._context;

		const groups = this.findPredicateGroups(operation.subject, operation.predicate);
		const subject = toPatternFromRef(operation.subject);
		const plan = createPlan({});
		const byBlock = new Map<SubjectBlock, PredicateGroup[]>();

		for (const { block, group } of groups) {
			byBlock.set(block, [...(byBlock.get(block) ?? []), group]);

			for (const object of group.objects) {
				plan.expectations.push({ subject, predicate: operation.predicate, object: toTermPattern(object.quad.object), delta: -1 });
				plan.quadCountDelta -= 1 + countStatementsWithin(context.model.quadContexts, object.start, object.end);
			}
		}

		for (const [block, removed] of byBlock) {
			for (const range of new ValueOperations(context).groupRunDeletionRanges(block, removed)) {
				const lines = expandToWholeLines(context.model.text, range.start, range.end);

				plan.edits.push(...deleteRange(context.model.text, context.model.tokens, lines.start, lines.end));
			}
		}

		return plan;
	}

	/**
	 * Find the groups of a predicate across the blocks of a subject, in document order.
	 * @param subject The subject whose groups to find.
	 * @param predicate The predicate of the groups.
	 * @returns The groups with the blocks holding them.
	 * @throws {EditRejectionError} If the subject does not carry the predicate.
	 */
	findPredicateGroups(subject: TermRef, predicate: string): { block: SubjectBlock; group: PredicateGroup }[] {
		const context = this._context;

		const found: { block: SubjectBlock; group: PredicateGroup }[] = [];

		for (const block of new StatementLocator(context.model).blocksOf(subject)) {
			for (const group of block.groups) {
				if (group.predicateIri === predicate) {
					found.push({ block, group });
				}
			}
		}

		if (found.length === 0) {
			throw new EditRejectionError('notFound', 'The resource does not carry this predicate.');
		}

		return found;
	}
}
