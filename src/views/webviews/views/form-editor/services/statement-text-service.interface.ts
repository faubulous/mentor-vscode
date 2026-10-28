import { ValueKind } from '@src/utilities/value-kind';
import { PropertyView, TermView } from '../form-editor-model';
import { LineVocabulary } from '../line/line-vocabulary';
import { PillDisplay } from '../line/term-info';
import { EditableStatement } from '../state/editable-statement';
import { EditableValue } from '../state/editable-value';

/**
 * Turns the statements of a card into what their rows edit and back into the Turtle the host
 * takes, against the terms the card knows. One per card, as the labels and the ranges of the
 * terms are those of the card.
 */
export interface IStatementTextService {
	/**
	 * The terms the card knows: the declared prefixes, its predicates and the resources it can
	 * name.
	 */
	readonly vocabulary: LineVocabulary;

	/**
	 * Indicate whether the row of a property can be edited as fields: a blank node among the items
	 * of a list cannot be put back from the text of the row, so such a row is only read.
	 * @param property The property.
	 * @returns `true` when the row can be edited.
	 */
	canEdit(property: PropertyView): boolean;

	/**
	 * Split a property into what its fields edit.
	 * @param property The property.
	 * @returns The statement.
	 */
	editableStatementOf(property: PropertyView): EditableStatement;

	/**
	 * The views of the terms a property names, keyed by the text they are written as, so the
	 * fields can show their labels and glyphs.
	 * @param property The property.
	 * @returns The views by text.
	 */
	termViewsOf(property: PropertyView): Record<string, TermView>;

	/**
	 * Write a statement as the one line it is stored as, in canonical form: items single-spaced,
	 * literals re-serialized, blank nodes left off.
	 * @param statement The statement.
	 * @returns The canonical text, empty without a predicate.
	 */
	canonicalTextOf(statement: EditableStatement): string;

	/**
	 * Write a statement as the text the host rewrites it from, with one placeholder for every
	 * blank node the statement keeps.
	 * @param statement The statement.
	 * @returns The statement text.
	 */
	statementTextOf(statement: EditableStatement): string;

	/**
	 * Tell why a canonical text is not a statement.
	 * @param text The canonical text.
	 * @returns The problem, or `undefined` for a statement.
	 */
	problemOf(text: string): string | undefined;

	/**
	 * Read what was typed into the field for a new value: a quoted literal, a list, a number or
	 * boolean, a resource name, or plain text, which becomes a literal unless the predicate takes
	 * resources.
	 * @param text The typed text.
	 * @param range What the predicate takes.
	 * @returns The value, or `undefined` when nothing was typed.
	 */
	valueOfTypedText(text: string, range: ValueKind): EditableValue | undefined;

	/**
	 * What a predicate takes, as far as the card knows.
	 * @param predicate The predicate as written.
	 * @returns The range, `any` for an unknown predicate.
	 */
	rangeOf(predicate: string): ValueKind;

	/**
	 * The IRI of a predicate as written.
	 * @param predicate The predicate as written: `a`, a prefixed name or an `<iri>`.
	 * @returns The IRI, or `undefined` for text that names none.
	 */
	predicateIriOf(predicate: string): string | undefined;

	/**
	 * The label a predicate is shown by while its field is not edited: its label as the row or
	 * the vocabulary knows it, else its prefixed name, else the text itself.
	 * @param predicate The predicate as written.
	 * @param terms The views of the terms of the row.
	 * @returns The label.
	 */
	predicateLabelOf(predicate: string, terms?: Record<string, TermView>): string;

	/**
	 * How a resource value is shown as a pill.
	 * @param text The resource as written.
	 * @param terms The views of the terms of the row.
	 * @returns The pill.
	 */
	pillDisplayOf(text: string, terms?: Record<string, TermView>): PillDisplay;
}
