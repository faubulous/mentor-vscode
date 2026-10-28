import { LineSerializer } from './line-serializer';
import { ValueField } from './value-field';
import { NESTED_NODE_MARKER, ValueFieldParser } from './value-field-parser';

/**
 * Writes the values of a statement row as the Turtle they stand on the line as.
 */
export class ValueFieldSerializer {
	/**
	 * Create a serializer.
	 * @param _parser Reads the source a literal was typed as, when it has one.
	 */
	constructor(private readonly _parser: ValueFieldParser) { }

	/**
	 * Keep a suffix only when it is a language tag or a datatype.
	 * @param suffix The suffix as typed.
	 * @returns The suffix, or an empty string.
	 */
	static validSuffix(suffix: string): string {
		return /^@[A-Za-z]+(-[A-Za-z0-9]+)*$/.test(suffix) || /^\^\^\S+$/.test(suffix) ? suffix : '';
	}

	/**
	 * Write one value field as Turtle.
	 * @param field The field.
	 * @returns The text, empty for a field without a value.
	 */
	serialize(field: ValueField): string {
		switch (field.kind) {
			case 'literal':
				return field.source === undefined ? _literalText(field.value, field.suffix) : this._sourceLiteralText(field.source);
			case 'resource':
			case 'shorthandLiteral':
			case 'source':
				return field.text.trim();
			case 'nestedNode':
				return NESTED_NODE_MARKER;
		}
	}

	/**
	 * Write the source a literal was typed as, read again as whatever it is now.
	 * @param source The typed text.
	 * @returns The text.
	 */
	private _sourceLiteralText(source: string): string {
		const read = this._parser.parse(source, 'any');

		if (!read) {
			return '';
		}

		return read.kind === 'literal' ? _literalText(read.value, read.suffix) : this.serialize(read);
	}
}

/**
 * Write a literal with its valid suffix.
 * @param value The value without escapes.
 * @param suffix The suffix as typed.
 * @returns The text.
 */
function _literalText(value: string, suffix: string): string {
	return `"${LineSerializer.escapeLiteral(value)}"${ValueFieldSerializer.validSuffix(suffix)}`;
}
