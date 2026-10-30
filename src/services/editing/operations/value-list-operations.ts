import { EditOperation } from '../edit-operation';
import { EditPlan, createPlan, netExpectedChanges } from '../edit-plan';
import { SubjectBlock } from '../statement-model';
import { StatementValueWriter } from '../statement-value-writer';
import { SynthesisContext } from '../synthesis-context';
import { toGraphPattern, toPatternFromRef } from '../term-patterns';
import { NewValue, ValueList } from '../value-list';
import { TextEditSpec } from '@src/utilities/text-edits';
import { ValueListResolver } from '../value-list-resolver';
import { ObjectListWriter } from './object-list-writer';
import { PropertyOperations } from './property-operations';
import { StatementLineWriter } from './statement-line-writer';
import { ValueOperations } from './value-operations';

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
			return new PropertyOperations(context).deleteProperty(operation.subject, operation.predicate);
		}

		const list = new ValueListResolver(context.model).resolve(operation.subject, operation.predicate, operation.values);
		const writer = new StatementValueWriter(context, list.items);
		const target = list.groups.length === 0 ? new PropertyOperations(context).newPropertyBlock(operation.subject) : undefined;
		const written = target ? this._writeNewPredicate(operation, list, writer, target) : this._writeValues(operation, list, writer);
		const subject = toPatternFromRef(operation.subject);
		const removed = list.groups.flatMap(group => group.removed);
		const added = target
			? list.added.map(value => ({ value, block: target }))
			: list.groups.flatMap(group => group.entries.flatMap(entry => entry.kind === 'new' ? [{ value: entry.value, block: group.block }] : []));
		const expectedChanges = [
			...removed.flatMap(span => new ValueOperations(context).removalChanges(subject, operation.predicate, span)),
			...added.flatMap(({ value, block }) => writer.expectedChangesOf(toGraphPattern(block.graph), subject, operation.predicate, value))
		];

		return createPlan({ edits: written, expectedChanges: netExpectedChanges(expectedChanges) });
	}

	/**
	 * Write the values of a predicate the subject carries.
	 * @param operation The operation.
	 * @param list The resolved edit.
	 * @param writer Writes the new values.
	 * @returns The edits.
	 */
	private _writeValues(operation: SetValuesOperation, list: ValueList, writer: StatementValueWriter): TextEditSpec[] {
		return this._context.writer.abbreviates
			? new ObjectListWriter(this._context, list, writer).write()
			: new StatementLineWriter(this._context, operation.predicate, list, writer).write();
	}

	/**
	 * Write the values of a predicate the subject does not carry yet into a block of the subject.
	 * @param operation The operation.
	 * @param list The resolved edit.
	 * @param writer Writes the new values.
	 * @param block The block, which also decides the graph of the values.
	 * @returns The edits.
	 */
	private _writeNewPredicate(operation: SetValuesOperation, list: ValueList, writer: StatementValueWriter, block: SubjectBlock): TextEditSpec[] {
		const context = this._context;

		if (!context.writer.abbreviates) {
			return new StatementLineWriter(context, operation.predicate, list, writer).writeNewPredicate(block);
		}

		return [new PropertyOperations(context).newProperty(block, operation.predicate, list.added.map((value: NewValue) => writer.write(value)).join(', '))];
	}
}
