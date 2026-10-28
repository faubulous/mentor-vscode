import { FieldId } from './field-id';
import { LineCanonicalizer } from './line-canonicalizer';
import { LineLexer } from './line-lexer';
import { ValueField } from './value-field';
import { ValueFieldParser } from './value-field-parser';
import { ValueFieldSerializer } from './value-field-serializer';

/**
 * A statement split into the fields it is edited in: the predicate and one field per value.
 * Changes return a new instance.
 */
export class StatementFields {
	/**
	 * The fields of an empty row.
	 */
	static readonly EMPTY = new StatementFields('', []);

	/**
	 * Create the fields of a statement.
	 * @param predicate The predicate as written: a prefixed name, `a` or an `<iri>`.
	 * @param values The fields of the values, in order.
	 */
	constructor(readonly predicate: string, readonly values: readonly ValueField[]) { }

	/**
	 * Split the canonical text of a statement into its fields.
	 * @param text The canonical text, such as `rdfs:label "Tree"@en`.
	 * @param parser Reads the fields of the values.
	 * @returns The fields.
	 */
	static fromLine(text: string, parser: ValueFieldParser): StatementFields {
		const lexer = new LineLexer();
		const tokens = lexer.tokenize(text);
		const predicate = lexer.items(tokens)[0];

		return new StatementFields(
			predicate && predicate.kind !== 'literal' ? predicate.text : '',
			lexer.valueGroups(tokens).map(group => parser.parseGroup(group, text))
		);
	}

	/**
	 * Join the fields into the canonical text of the statement.
	 * @param serializer Writes the fields of the values.
	 * @param canonicalizer Brings the text into canonical form.
	 * @returns The canonical text, empty without a predicate.
	 */
	toLineText(serializer: ValueFieldSerializer, canonicalizer: LineCanonicalizer): string {
		const predicate = this.predicate.trim();

		if (!predicate) {
			return '';
		}

		const values = this.values.map(field => serializer.serialize(field)).filter(text => text.length > 0);

		return canonicalizer.canonicalize([predicate, ...values].join(' '));
	}

	/**
	 * The fields in the order the arrows walk them: the predicate, each value with the tag of a
	 * literal after it, and the field for a new value.
	 * @returns The identifiers, in order.
	 */
	fieldOrder(): FieldId[] {
		const values = this.values.flatMap((field, index) => field.kind === 'literal' && field.suffix ? [FieldId.value(index), FieldId.tag(index)] : [FieldId.value(index)]);

		return [FieldId.PREDICATE, ...values, FieldId.NEW_VALUE];
	}

	/**
	 * The field next to another in the order of the row.
	 * @param from The current field.
	 * @param direction Which way.
	 * @returns The neighbour, or `undefined` past the first or last field.
	 */
	neighbourField(from: FieldId, direction: 'previous' | 'next'): FieldId | undefined {
		const order = this.fieldOrder();
		const index = order.findIndex(field => field.equals(from));

		return index < 0 ? undefined : order[direction === 'next' ? index + 1 : index - 1];
	}

	/**
	 * Replace the predicate.
	 * @param predicate The predicate as written.
	 * @returns The fields with the predicate.
	 */
	withPredicate(predicate: string): StatementFields {
		return new StatementFields(predicate, this.values);
	}

	/**
	 * Replace one value.
	 * @param index The index of the value.
	 * @param field The field to put in its place.
	 * @returns The fields with the value replaced.
	 */
	withValue(index: number, field: ValueField): StatementFields {
		return new StatementFields(this.predicate, this.values.map((existing, position) => position === index ? field : existing));
	}

	/**
	 * Insert a value.
	 * @param index The index the value takes.
	 * @param field The field of the value.
	 * @returns The fields with the value inserted.
	 */
	withValueInserted(index: number, field: ValueField): StatementFields {
		return new StatementFields(this.predicate, [...this.values.slice(0, index), field, ...this.values.slice(index)]);
	}

	/**
	 * Remove one value.
	 * @param index The index of the value.
	 * @returns The fields without the value.
	 */
	withoutValue(index: number): StatementFields {
		return new StatementFields(this.predicate, this.values.filter((_, position) => position !== index));
	}
}
