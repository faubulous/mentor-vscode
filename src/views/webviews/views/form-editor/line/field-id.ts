/**
 * The kinds of field a statement row has: its predicate, a value, the language tag or datatype
 * of a literal value, and the field for a new value.
 */
export type FieldIdKind = 'predicate' | 'value' | 'tag' | 'newValue';

/**
 * Names one field of a statement row. Written as `predicate`, `newValue`, `value:<index>` or
 * `tag:<index>` in element attributes.
 */
export class FieldId {
	/**
	 * The field of the predicate.
	 */
	static readonly PREDICATE = new FieldId('predicate');

	/**
	 * The field a new value is typed into.
	 */
	static readonly NEW_VALUE = new FieldId('newValue');

	/**
	 * Create a field identifier.
	 * @param kind The kind of field.
	 * @param index The index of the value the field belongs to.
	 */
	private constructor(readonly kind: FieldIdKind, readonly index?: number) { }

	/**
	 * The field of a value.
	 * @param index The index of the value.
	 * @returns The identifier.
	 */
	static value(index: number): FieldId {
		return new FieldId('value', index);
	}

	/**
	 * The field of the language tag or datatype of a literal value.
	 * @param index The index of the value.
	 * @returns The identifier.
	 */
	static tag(index: number): FieldId {
		return new FieldId('tag', index);
	}

	/**
	 * Read a field identifier from its written form.
	 * @param text The written form.
	 * @returns The identifier, or `undefined` for text that names no field.
	 */
	static parse(text: string): FieldId | undefined {
		if (text === 'predicate') {
			return FieldId.PREDICATE;
		}

		if (text === 'newValue') {
			return FieldId.NEW_VALUE;
		}

		const match = /^(value|tag):(\d+)$/.exec(text);

		return match ? new FieldId(match[1] as FieldIdKind, Number(match[2])) : undefined;
	}

	/**
	 * Indicate whether two identifiers name the same field.
	 * @param other The other identifier.
	 * @returns `true` for the same field.
	 */
	equals(other: FieldId | undefined): boolean {
		return other !== undefined && this.kind === other.kind && this.index === other.index;
	}

	/**
	 * Write the identifier for an element attribute.
	 * @returns The written form.
	 */
	toString(): string {
		return this.index === undefined ? this.kind : `${this.kind}:${this.index}`;
	}
}
