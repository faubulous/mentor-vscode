import { QuadContext } from '@faubulous/mentor-rdf-parsers';
import { EditOperation } from '../edit-operation';
import { EditPlan, QuadExpectation, TermPattern, createPlan } from '../edit-plan';
import { EditRejectionError } from '../edit-rejection';
import { ObjectSpan, PredicateGroup, SubjectBlock } from '../statement-model';
import { ParsedStatement, StatementTextParser } from '../statement-text-parser';
import { PropertyOperations } from './property-operations';
import { ValueOperations } from './value-operations';
import { StatementLocator } from '../statement-locator';
import { deleteRange, expandToWholeLines } from '@src/utilities/text-edits';
import { statementsWithin } from '@src/utilities/quad-contexts';
import { SynthesisContext } from '../synthesis-context';
import { toPatternFromRef, toTermPattern } from '../term-patterns';
import { TextEditSpec } from '@src/utilities/text-edits';
import { isCommentToken } from '@src/utilities/tokens';

type ReplaceStatementOperation = Extract<EditOperation, { op: 'replaceStatement' }>;

/**
 * Rewrite the statement of a predicate from one line of Turtle. The first group of the predicate
 * is replaced by the line, written with the predicate as the document writes it and the objects
 * as typed, one per line when the group was written so; further groups of the predicate in the
 * same block go, as the form shows one row per predicate. Comments written inside the group are
 * kept after the rewritten statement. Without a predicate the line adds a new one.
 */

/**
 * Add the statement of a predicate the subject does not carry yet, after its last predicate.
 */

/**
 * Write the predicate and the objects of a parsed statement in the style of the group it replaces.
 */

/**
 * The edits replacing a group with the new statement. A comment written inside the group stays:
 * the statement replaces what precedes the first comment, and what follows it goes, except for
 * further comments, each of which keeps a line of its own.
 */

/**
 * The edits removing the further groups of the predicate in the block.
 */

/**
 * How the statements change: every pattern among the removed objects and their nested statements
 * counts down, every pattern among the parsed ones counts up, and what is written the same before
 * and after, such as a nested node kept through a placeholder, nets out.
 */

/**
 * The expectation that a statement of a nested node or list changes in number.
 */

function _nestedExpectation(quad: QuadContext, delta: number): QuadExpectation {
	return { subject: toTermPattern(quad.subject), predicate: quad.predicate.value, object: toTermPattern(quad.object), delta };
}

/**
 * Rewrites the statement of a predicate from one line of Turtle.
 */
export class StatementOperations {
	/**
	 * Create the operations of one user action.
	 * @param _context The shared state of the action.
	 */
	constructor(private readonly _context: SynthesisContext) { }

	replaceStatement(operation: ReplaceStatementOperation): EditPlan {
		const context = this._context;

		if (operation.predicate === undefined) {
			return this._synthesizeNewStatement(operation);
		}

		const groups = new PropertyOperations(context).findPredicateGroups(operation.subject, operation.predicate);
		const { block, group } = groups[0];
		const duplicates = groups.slice(1).filter(candidate => candidate.block === block).map(candidate => candidate.group);
		const parsed = new StatementTextParser(context).parse(operation.subject, new StatementTextParser(context).spliceHoles(operation.text, group));
		const edits = this._replacementEdits(group, this._writeStatement(block, group, parsed));
		const removed = [group, ...duplicates].flatMap(candidate => candidate.objects);

		return createPlan({
			edits: [...edits, ...this._duplicateDeletions(block, duplicates)],
			expectations: this._expectations(toPatternFromRef(operation.subject), group.predicateIri, removed, parsed),
			quadCountDelta: parsed.quads.length - removed.reduce((sum, object) => sum + 1 + statementsWithin(context.model.quadContexts, object.start, object.end).length, 0),
			focus: { edit: edits[0], offsetWithin: 0, target: 'predicate' }
		});
	}

	private _synthesizeNewStatement(operation: ReplaceStatementOperation): EditPlan {
		const context = this._context;

		if (StatementTextParser.findHoles(operation.text).length > 0) {
			throw new EditRejectionError('invalidTerm', 'A new statement cannot refer to nested nodes that are already written.');
		}

		const parsed = new StatementTextParser(context).parse(operation.subject, operation.text);
		const carried = new StatementLocator(context.model).blocksOf(operation.subject).some(block => block.groups.some(group => group.predicateIri === parsed.predicateIri));

		if (carried) {
			throw new EditRejectionError('ambiguous', 'The resource already carries this predicate. Edit its statement instead.');
		}

		const statement = parsed.objects.join(', ');
		const plan = new PropertyOperations(context).newProperty(operation.subject, parsed.predicateIri, statement);
		const edit = plan.edits[0];
		const written = `${context.writer.writePredicate(parsed.predicateIri)} ${statement}`;

		plan.focus = { edit, offsetWithin: edit.newText.length - written.length, target: 'predicate' };
		plan.expectations.push(...this._expectations(toPatternFromRef(operation.subject), parsed.predicateIri, [], parsed));
		plan.quadCountDelta += parsed.quads.length;

		return plan;
	}

	private _writeStatement(block: SubjectBlock, group: PredicateGroup, parsed: ParsedStatement): string {
		const context = this._context;

		const predicate = context.writer.writePredicate(parsed.predicateIri);
		const separator = context.styleDetector.objectsOnePerLine(group)
			? `,${context.style.eol}${context.styleDetector.objectIndentFor(block, group)}`
			: ', ';

		return `${predicate} ${parsed.objects.join(separator)}`;
	}

	private _replacementEdits(group: PredicateGroup, newText: string): TextEditSpec[] {
		const context = this._context;

		const { text, tokens } = context.model;
		const comment = tokens.slice(group.startTokenIndex, group.endTokenIndex + 1).find(isCommentToken);

		if (!comment) {
			return [{ start: group.start, end: group.end, newText }];
		}

		return [
			{ start: group.start, end: comment.startOffset, newText: `${newText} ` },
			...deleteRange(text, tokens, comment.startOffset, group.end)
		];
	}

	private _duplicateDeletions(block: SubjectBlock, duplicates: PredicateGroup[]): TextEditSpec[] {
		const context = this._context;

		const { text, tokens } = context.model;

		return new ValueOperations(context).groupRunDeletionRanges(block, duplicates).flatMap(range => {
			const lines = expandToWholeLines(text, range.start, range.end);

			return deleteRange(text, tokens, lines.start, lines.end);
		});
	}

	private _expectations(subject: TermPattern, oldPredicate: string, removed: readonly ObjectSpan[], parsed: ParsedStatement): QuadExpectation[] {
		const context = this._context;

		const expectations = new Map<string, QuadExpectation>();
		const count = (expectation: QuadExpectation): void => {
			const key = JSON.stringify([expectation.subject, expectation.predicate, expectation.object]);
			const existing = expectations.get(key);

			expectations.set(key, existing ? { ...existing, delta: existing.delta + expectation.delta } : expectation);
		};

		for (const object of removed) {
			count({ subject, predicate: oldPredicate, object: toTermPattern(object.quad.object), delta: -1 });
			statementsWithin(context.model.quadContexts, object.start, object.end).forEach(quad => count(_nestedExpectation(quad, -1)));
		}

		for (const quad of parsed.quads) {
			count(parsed.subjectQuads.includes(quad)
				? { subject, predicate: parsed.predicateIri, object: toTermPattern(quad.object), delta: 1 }
				: _nestedExpectation(quad, 1));
		}

		return Array.from(expectations.values()).filter(expectation => expectation.delta !== 0);
	}
}
