import { InputFieldId } from './input-field-id';
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
	 * Whether the row has a field for a new value: the input after the pills of a row that holds
	 * resources, or the one field of a row that holds nothing yet. A row of literals has none:
	 * its values are the fields it shows.
	 */
	get hasNewValueField(): boolean {
		return this.values.some(value => value.kind !== 'literal' && value.kind !== 'shorthandLiteral') || !this.values.some(value => value.kind === 'literal' || value.kind === 'shorthandLiteral');
	}

	/**
	 * The fields in the order the arrows walk them: the predicate, each pill, each literal with
	 * the button of its tag after it, and the field for a new value when the row has one. A nested
	 * node is a card, not a field.
	 * @returns The identifiers, in order.
	 */
	fieldOrder(): InputFieldId[] {
		const values = this.values.flatMap((value, index) => {
			switch (value.kind) {
				case 'nestedNode':
					return [];
				case 'literal':
					return [InputFieldId.value(index), InputFieldId.tag(index)];
				default:
					return [InputFieldId.value(index)];
			}
		});

		return [InputFieldId.PREDICATE, ...values, ...(this.hasNewValueField ? [InputFieldId.NEW_VALUE] : [])];
	}

	/**
	 * The fields in the order Tab walks them: as the arrows do, but the pills of a row are one
	 * stop, the input after them.
	 * @returns The identifiers, in order.
	 */
	tabOrder(): InputFieldId[] {
		return this.fieldOrder().filter(field => field.kind !== 'value' || !this._isPill(field.index));
	}

	/**
	 * The field next to another in the order of the row.
	 * @param from The current field.
	 * @param direction Which way.
	 * @param stops Whether to walk the stops of Tab rather than every field.
	 * @returns The neighbour, or `undefined` past the first or last field.
	 */
	neighbourField(from: InputFieldId, direction: 'previous' | 'next', stops = false): InputFieldId | undefined {
		const order = stops ? this.tabOrder() : this.fieldOrder();
		const index = order.findIndex(field => field.equals(from));

		return index < 0 ? undefined : order[direction === 'next' ? index + 1 : index - 1];
	}

	/**
	 * The field the caret goes to at the end of the row: the field for a new value when the row
	 * has one, else the last literal.
	 * @returns The identifier.
	 */
	lastField(): InputFieldId {
		if (this.hasNewValueField) {
			return InputFieldId.NEW_VALUE;
		}

		const literals = this.fieldOrder().filter(field => field.kind === 'value');

		return literals[literals.length - 1] ?? InputFieldId.PREDICATE;
	}

	/**
	 * Indicate whether a value is shown as a pill.
	 * @param index The index of the value.
	 * @returns `true` for a resource.
	 */
	private _isPill(index: number | undefined): boolean {
		return index !== undefined && this.values[index]?.kind === 'resource';
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
