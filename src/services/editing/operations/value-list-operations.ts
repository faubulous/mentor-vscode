import { QuadContext } from '@faubulous/mentor-rdf-parsers';
import { statementsWithin } from '@src/utilities/quad-contexts';
import { EditOperation } from '../edit-operation';
import { EditPlan, QuadExpectation, TermPattern, createPlan, netExpectations } from '../edit-plan';
import { StatementLocator } from '../statement-locator';
import { StatementValueWriter } from '../statement-value-writer';
import { SynthesisContext } from '../synthesis-context';
import { toPatternFromRef, toTermPattern } from '../term-patterns';
import { NewValue, ValueList } from '../value-list';
import { ValueListEdits } from '../value-list-edits';
import { ValueListResolver } from '../value-list-resolver';
import { ObjectListWriter } from './object-list-writer';
import { PropertyOperations } from './property-operations';
import { StatementLineWriter } from './statement-line-writer';

/**
 * The `setValues` operation of the edit contract.
 */
type SetValuesOperation = Extract<EditOperation, { op: 'setValues' }>;

/**
 * Sets the values of a predicate of a subject, in the syntax of the document.
 */
export class ValueListOperations {
	/**
	 * Create the operations of one user action.
	 * @param _context The shared state of the action.
	 */
	constructor(private readonly _context: SynthesisContext) { }

	/**
	 * Make the given values the values of a predicate: written values that are not listed go,
	 * listed ones stay, and new ones are written next to their neighbours, as one list of objects
	 * where the syntax has them and one line per value where it does not. No values removes the
	 * predicate.
	 * @param operation The values to set.
	 * @returns The plan setting them.
	 * @throws {EditRejectionError} If a value refers to nothing written under the predicate, cannot be written, or would move between statements, or the subject would lose its last statement.
	 */
	setValues(operation: SetValuesOperation): EditPlan {
		const context = this._context;

		if (operation.values.length === 0) {
			return new PropertyOperations(context).deleteProperty({ op: 'deleteProperty', subject: operation.subject, predicate: operation.predicate });
		}

		const list = new ValueListResolver(context.model).resolve(operation.subject, operation.predicate, operation.values);
		const writer = new StatementValueWriter(context, list.items);
		const written = list.groups.length === 0 ? this._writeNewPredicate(operation, list, writer) : this._writeValues(operation, list, writer);
		const subject = toPatternFromRef(operation.subject);
		const removed = list.groups.flatMap(group => group.removed);
		const added = list.groups.length === 0 ? list.added : list.groups.flatMap(group => group.entries.flatMap(entry => entry.kind === 'new' ? [entry.value] : []));
		const expectations = [
			...removed.flatMap(span => this._removalExpectations(subject, operation.predicate, span.quad, span.start, span.end)),
			...added.flatMap(value => writer.expectationsOf(subject, operation.predicate, value))
		];
		const removedCount = removed.reduce((sum, span) => sum + 1 + statementsWithin(context.model.quadContexts, span.start, span.end).length, 0);
		const addedCount = added.reduce((sum, value) => sum + writer.statementCountOf(value), 0);

		return createPlan({ edits: written.edits, focus: written.focus, expectations: netExpectations(expectations), quadCountDelta: addedCount - removedCount });
	}

	/**
	 * Write the values of a predicate the subject carries.
	 * @param operation The operation.
	 * @param list The resolved edit.
	 * @param writer Writes the new values.
	 * @returns The edits.
	 */
	private _writeValues(operation: SetValuesOperation, list: ValueList, writer: StatementValueWriter): ValueListEdits {
		return this._context.writer.abbreviates
			? new ObjectListWriter(this._context, list, writer).write()
			: new StatementLineWriter(this._context, operation.predicate, list, writer).write();
	}

	/**
	 * Write the values of a predicate the subject does not carry yet, after its last statement.
	 * @param operation The operation.
	 * @param list The resolved edit.
	 * @param writer Writes the new values.
	 * @returns The edits.
	 */
	private _writeNewPredicate(operation: SetValuesOperation, list: ValueList, writer: StatementValueWriter): ValueListEdits {
		const context = this._context;

		if (!context.writer.abbreviates) {
			const blocks = new StatementLocator(context.model).blocksOf(operation.subject);

			return new StatementLineWriter(context, operation.predicate, list, writer).writeNewPredicate(blocks[blocks.length - 1]);
		}

		const plan = new PropertyOperations(context).newProperty(operation.subject, operation.predicate, list.added.map((value: NewValue) => writer.write(value)).join(', '));

		return { edits: plan.edits, focus: plan.focus };
	}

	/**
	 * The statements a written value takes with it when it goes: its own and those nested in it.
	 * @param subject The subject of the statement.
	 * @param predicate The predicate of the statement.
	 * @param quad The statement of the value.
	 * @param start The offset the value starts at.
	 * @param end The offset the value ends at.
	 * @returns The expectations.
	 */
	private _removalExpectations(subject: TermPattern, predicate: string, quad: QuadContext, start: number, end: number): QuadExpectation[] {
		const nested = statementsWithin(this._context.model.quadContexts, start, end).map(inner => ({
			subject: toTermPattern(inner.subject),
			predicate: inner.predicate.value,
			object: toTermPattern(inner.object),
			delta: -1
		}));

		return [{ subject, predicate, object: toTermPattern(quad.object), delta: -1 }, ...nested];
	}
}
