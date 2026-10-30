import { EditOperation } from '../edit-operation';
import { TermRef } from '../term-ref';
import { EditPlan, createPlan, netExpectedChanges } from '../edit-plan';
import { EditRejectionError } from '../edit-rejection';
import { PredicateGroup, SubjectBlock } from '../statement-model';
import { ValueOperations } from './value-operations';
import { StatementLocator } from '../statement-locator';
import { SynthesisContext } from '../synthesis-context';
import { toPatternFromRef, toTermPattern } from '../term-patterns';
import { tokenEnd } from '@src/utilities/tokens';

/**
 * The `setPredicate` operation of the edit contract.
 */
type SetPredicateOperation = Extract<EditOperation, { op: 'setPredicate' }>;

/**
 * Adds, renames and deletes the predicates of a subject.
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
	 * Write the values of a predicate under another predicate: the predicate of every statement
	 * of it is rewritten, the objects stay as they are.
	 * @param operation The predicate and its replacement.
	 * @returns The plan rewriting the predicates, or an empty plan when the predicate stays.
	 * @throws {EditRejectionError} If the subject does not carry the predicate, already carries the new one, or the new one is not a valid IRI.
	 */
	setPredicate(operation: SetPredicateOperation): EditPlan {
		const context = this._context;

		if (operation.newPredicate === operation.predicate) {
			return createPlan({});
		}

		const groups = this.findPredicateGroups(operation.subject, operation.predicate).map(({ group }) => group);
		const carried = new StatementLocator(context.model).blocksOf(operation.subject).some(block => block.groups.some(group => group.predicateIri === operation.newPredicate));

		if (carried) {
			throw new EditRejectionError('ambiguous', 'The resource already carries this predicate.');
		}

		const written = context.writer.writePredicate(operation.newPredicate);
		const edits = groups.map(group => ({ start: group.predicateToken.startOffset, end: tokenEnd(group.predicateToken), newText: written }));
		const subject = toPatternFromRef(operation.subject);
		const objects = groups.flatMap(group => group.objects);

		return createPlan({
			edits,
			expectedChanges: netExpectedChanges(objects.flatMap(object => [
				{ subject, predicate: operation.predicate, object: toTermPattern(object.quad.object), delta: -1 },
				{ subject, predicate: operation.newPredicate, object: toTermPattern(object.quad.object), delta: 1 }
			])),
			focus: { edit: edits[0], offsetWithin: 0, target: 'predicate' }
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
	 * Remove a predicate with all its values from every block of the subject, as
	 * {@link ValueOperations.groupDeletions} removes groups: a block that loses all its groups goes
	 * with its comments, unless no block of the subject would keep a statement.
	 * @param subjectRef The subject.
	 * @param predicate The IRI of the predicate to remove.
	 * @returns The plan removing the groups.
	 * @throws {EditRejectionError} If the subject does not carry the predicate, or the predicate holds the last statements about the subject.
	 */
	deleteProperty(subjectRef: TermRef, predicate: string): EditPlan {
		const context = this._context;

		const groups = this.findPredicateGroups(subjectRef, predicate);
		const subject = toPatternFromRef(subjectRef);
		const plan = createPlan({});
		const values = new ValueOperations(context);
		const byBlock = new Map<SubjectBlock, PredicateGroup[]>();

		for (const { block, group } of groups) {
			byBlock.set(block, [...(byBlock.get(block) ?? []), group]);

			for (const object of group.objects) {
				plan.expectedChanges.push(...values.removalChanges(subject, predicate, object));
			}
		}

		plan.edits.push(...values.groupDeletions(byBlock));

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
