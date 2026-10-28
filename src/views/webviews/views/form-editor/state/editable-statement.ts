import { InputFieldId } from '../input/input-field-id';
import { EditableValue } from './editable-value';

/**
 * A statement split into what its fields edit: the predicate as written and one value per field.
 * Immutable: every change returns a new statement.
 */
export class EditableStatement {
	/**
	 * The statement of an empty row.
	 */
	static readonly EMPTY = new EditableStatement('', []);

	/**
	 * Create a statement.
	 * @param predicate The predicate as written: a prefixed name, `a` or an `<iri>`.
	 * @param values The values, in order.
	 */
	constructor(readonly predicate: string, readonly values: readonly EditableValue[]) { }

	/**
	 * Whether the statement states nothing: it has no predicate or no values.
	 */
	get isEmpty(): boolean {
		return this.predicate.trim() === '' || this.values.length === 0;
	}

	/**
	 * The fields in the order the arrows walk them: the predicate, each value with the tag of a
	 * literal after it, and the field for a new value. A nested node is a card, not a field.
	 * @returns The identifiers, in order.
	 */
	fieldOrder(): InputFieldId[] {
		const values = this.values.flatMap((value, index) => {
			if (value.kind === 'nestedNode') {
				return [];
			}

			return value.kind === 'literal' && value.suffix ? [InputFieldId.value(index), InputFieldId.tag(index)] : [InputFieldId.value(index)];
		});

		return [InputFieldId.PREDICATE, ...values, InputFieldId.NEW_VALUE];
	}

	/**
	 * The field next to another in the order of the row.
	 * @param from The current field.
	 * @param direction Which way.
	 * @returns The neighbour, or `undefined` past the first or last field.
	 */
	neighbourField(from: InputFieldId, direction: 'previous' | 'next'): InputFieldId | undefined {
		const order = this.fieldOrder();
		const index = order.findIndex(field => field.equals(from));

		return index < 0 ? undefined : order[direction === 'next' ? index + 1 : index - 1];
	}

	/**
	 * The field of the last value, or the field for a new value when there is none.
	 * @returns The identifier.
	 */
	lastField(): InputFieldId {
		const order = this.fieldOrder();
		const last = order[order.length - 2];

		return last && last.kind !== 'predicate' ? last : InputFieldId.NEW_VALUE;
	}

	/**
	 * Replace the predicate.
	 * @param predicate The predicate as written.
	 * @returns The statement with the predicate.
	 */
	withPredicate(predicate: string): EditableStatement {
		return new EditableStatement(predicate, this.values);
	}

	/**
	 * Replace one value.
	 * @param index The index of the value.
	 * @param value The value to put in its place.
	 * @returns The statement with the value replaced.
	 */
	withValue(index: number, value: EditableValue): EditableStatement {
		return new EditableStatement(this.predicate, this.values.map((existing, position) => position === index ? value : existing));
	}

	/**
	 * Add a value after the others.
	 * @param value The value.
	 * @returns The statement with the value.
	 */
	withValueAppended(value: EditableValue): EditableStatement {
		return new EditableStatement(this.predicate, [...this.values, value]);
	}

	/**
	 * Remove one value.
	 * @param index The index of the value.
	 * @returns The statement without the value.
	 */
	withoutValue(index: number): EditableStatement {
		return new EditableStatement(this.predicate, this.values.filter((_, position) => position !== index));
	}
}
