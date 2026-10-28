/**
 * The kinds of input field a statement row has: its predicate, a value, the language tag or
 * datatype of a literal value, and the field for a new value.
 */
export type InputFieldKind = 'predicate' | 'value' | 'tag' | 'newValue';

/**
 * Names one input field of a statement row. Written as `predicate`, `newValue`, `value:<index>`
 * or `tag:<index>` in the `data-field` attribute of the field.
 */
export class InputFieldId {
	/**
	 * The field of the predicate.
	 */
	static readonly PREDICATE = new InputFieldId('predicate');

	/**
	 * The field a new value is typed into.
	 */
	static readonly NEW_VALUE = new InputFieldId('newValue');

	/**
	 * Create a field identifier.
	 * @param kind The kind of field.
	 * @param index The index of the value the field belongs to.
	 */
	private constructor(readonly kind: InputFieldKind, readonly index?: number) { }

	/**
	 * The field of a value.
	 * @param index The index of the value.
	 * @returns The identifier.
	 */
	static value(index: number): InputFieldId {
		return new InputFieldId('value', index);
	}

	/**
	 * The field of the language tag or datatype of a literal value.
	 * @param index The index of the value.
	 * @returns The identifier.
	 */
	static tag(index: number): InputFieldId {
		return new InputFieldId('tag', index);
	}

	/**
	 * Read a field identifier from its written form.
	 * @param text The written form.
	 * @returns The identifier, or `undefined` for text that names no field.
	 */
	static parse(text: string): InputFieldId | undefined {
		if (text === 'predicate') {
			return InputFieldId.PREDICATE;
		}

		if (text === 'newValue') {
			return InputFieldId.NEW_VALUE;
		}

		const match = /^(value|tag):(\d+)$/.exec(text);

		return match ? new InputFieldId(match[1] as InputFieldKind, Number(match[2])) : undefined;
	}

	/**
	 * Indicate whether two identifiers name the same field.
	 * @param other The other identifier.
	 * @returns `true` for the same field.
	 */
	equals(other: InputFieldId | undefined): boolean {
		return other !== undefined && this.kind === other.kind && this.index === other.index;
	}

	/**
	 * Write the identifier for the `data-field` attribute.
	 * @returns The written form.
	 */
	toString(): string {
		return this.index === undefined ? this.kind : `${this.kind}:${this.index}`;
	}
}
